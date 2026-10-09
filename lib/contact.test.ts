import { describe, it, expect, vi } from "vitest";
import {
  HONEYPOT_FIELD, UNKNOWN_IP, buildEmail, contactDepsFrom, createRateLimiter, createResendSender, createTurnstileVerifier,
  parseContact, rateKey, submitContact, typedValues, type ContactDeps, type Outcome,
} from "./contact";

const OK: Outcome = { ok: true };
const NO: Outcome = { ok: false, reason: "403" };

function form(over: Record<string, string | File> = {}): FormData {
  const f = new FormData();
  const base = {
    name: "Ada Lovelace", email: "ada@example.com", message: "I would like to talk about a project.",
    budget: "", locale: "en", contact_ref: "", "cf-turnstile-response": "tok",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) f.set(k, v);
  return f;
}

function deps(over: Partial<ContactDeps> = {}): ContactDeps {
  return {
    ip: "203.0.113.7", now: () => 1_000_000, limiter: createRateLimiter(5, 3_600_000), fuse: createRateLimiter(30, 3_600_000),
    verifyToken: vi.fn(async () => OK), send: vi.fn(async () => OK), dryRun: false, log: vi.fn(), ...over,
  };
}

describe("parseContact", () => {
  it("accepts a valid submission and trims", () => {
    const r = parseContact(form({ name: "  Ada  ", budget: "1k-5k" }));
    expect(r).toEqual({ ok: true, data: { name: "Ada", email: "ada@example.com", message: "I would like to talk about a project.", budget: "1k-5k", locale: "en" } });
  });
  it("treats an empty budget as absent and rejects an unknown one", () => {
    const ok = parseContact(form());
    expect(ok.ok && ok.data.budget).toBeUndefined();
    const bad = parseContact(form({ budget: "a lot" }));
    expect(!bad.ok && bad.fieldErrors.budget).toBe("invalid");
  });
  it.each([
    ["name", "", "required"], ["name", "A", "tooShort"], ["name", "x".repeat(81), "tooLong"],
    ["email", "", "required"], ["email", "not-an-email", "invalid"],
    ["message", "", "required"], ["message", "too short", "tooShort"], ["message", "x".repeat(2001), "tooLong"],
  ] as const)("%s=%j → %s", (field, value, code) => {
    const r = parseContact(form({ [field]: value }));
    expect(!r.ok && r.fieldErrors[field]).toBe(code);
  });
  it("returns what the visitor typed so the form can refill", () => {
    const r = parseContact(form({ email: "nope", message: "hello there, this is long enough" }));
    expect(!r.ok && r.values).toEqual({ name: "Ada Lovelace", email: "nope", message: "hello there, this is long enough", budget: "" });
  });
  it("rejects a newline in the name (header injection)", () => {
    const r = parseContact(form({ name: "Ada\r\nBcc: x@y.z" }));
    expect(!r.ok && r.fieldErrors.name).toBe("invalid");
  });
  it("falls back to en for an unknown locale", () => {
    const r = parseContact(form({ locale: "xx" }));
    expect(r.ok && r.data.locale).toBe("en");
  });
  it("uses an autofill-safe honeypot name", () => expect(HONEYPOT_FIELD).toBe("contact_ref"));
  it.each(["name", "email", "message"] as const)("a File in %s → required, no throw", (field) => {
    const r = parseContact(form({ [field]: new File(["x"], "a.txt") }));
    expect(!r.ok && r.fieldErrors[field]).toBe("required");
  });
  it("whitespace-only message → required", () => {
    const r = parseContact(form({ message: "   \n\t  " }));
    expect(!r.ok && r.fieldErrors.message).toBe("required");
  });
  it("accepts boundary lengths: name 2 and 80, message 10 and 2000, e-mail 254", () => {
    const email254 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
    expect(email254).toHaveLength(254);
    for (const over of <Record<string, string>[]>[{ name: "Ad" }, { name: "x".repeat(80) }, { message: "x".repeat(10) }, { message: "x".repeat(2000) }, { email: email254 }]) {
      expect(parseContact(form(over)).ok).toBe(true);
    }
    const r = parseContact(form({ email: `a${email254}` }));
    expect(!r.ok && r.fieldErrors.email).toBeDefined();
  });
  it("a budget with surrounding spaces → invalid", () => {
    const r = parseContact(form({ budget: " 1k-5k " }));
    expect(!r.ok && r.fieldErrors.budget).toBe("invalid");
  });
  it.each(["\u0085", "\u2028", "\u2029"])("line separator %j in the name → invalid", (sep) => {
    const r = parseContact(form({ name: `Ada${sep}Bcc` }));
    expect(!r.ok && r.fieldErrors.name).toBe("invalid");
  });
  it("pre-guard: over 5000 chars → tooLong, values truncated to 5000", () => {
    const r = parseContact(form({ name: "x".repeat(6000), email: "y".repeat(5001), message: "z".repeat(9000) }));
    expect(!r.ok && r.fieldErrors).toEqual({ name: "tooLong", email: "tooLong", message: "tooLong" });
    expect(!r.ok && [r.values.name.length, r.values.email.length, r.values.message.length]).toEqual([5000, 5000, 5000]);
  });
});

describe("createRateLimiter", () => {
  it("allows max hits per window per key, then blocks", () => {
    const l = createRateLimiter(2, 1000);
    expect([l.hit("a", 0), l.hit("a", 1), l.hit("a", 2)]).toEqual([true, true, false]);
    expect(l.hit("b", 2)).toBe(true);
  });
  it("frees the slot when the window passes", () => {
    const l = createRateLimiter(1, 1000);
    expect(l.hit("a", 0)).toBe(true);
    expect(l.hit("a", 999)).toBe(false);
    expect(l.hit("a", 1000)).toBe(true);
  });
  it("drops expired keys so the map cannot grow without bound", () => {
    const l = createRateLimiter(1, 1000);
    for (let i = 0; i < 50; i++) l.hit(`k${i}`, 0);
    l.hit("late", 5000);
    expect(l.size(5000)).toBe(1);
  });
  it("size() sweeps expired keys itself, even if no hit happens afterwards", () => {
    const l = createRateLimiter(1, 1000);
    for (let i = 0; i < 10_000; i++) l.hit(`k${i}`, 0);
    expect(l.size(999)).toBe(10_000);
    expect(l.size(1000)).toBe(0);
    expect(l.hit("fresh", 1000)).toBe(true);
    expect(l.size(1000)).toBe(1);
  });
  it("an expired caller is allowed again without waiting for a sweep", () => {
    const l = createRateLimiter(1, 1000);
    expect(l.hit("a", 0)).toBe(true);
    expect(l.hit("a", 1000)).toBe(true);
  });
});

describe("buildEmail", () => {
  const data = { name: "Ada", email: "ada@example.com", message: "Line one\n<script>alert(1)</script>", budget: "1k-5k" as const, locale: "tr" };
  it("is plain text with reply-to and a single-line subject", () => {
    const e = buildEmail(data);
    expect(e.replyTo).toBe("ada@example.com");
    expect(e.subject).toBe("Portfolio contact: Ada");
    expect(e.subject).not.toMatch(/[\r\n]/);
    expect(e.text).toContain("<script>alert(1)</script>");
    expect(e.text).toContain("Budget: 1k-5k");
    expect(e.text).toContain("Locale: tr");
  });
  it("omits the budget line when absent", () => {
    expect(buildEmail({ ...data, budget: undefined }).text).not.toContain("Budget:");
  });
});

describe("createTurnstileVerifier", () => {
  it("posts secret, token and ip and returns success", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    const ok = await createTurnstileVerifier("sec", f as unknown as typeof fetch)("tok", "1.2.3.4");
    expect(ok).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = init.body as URLSearchParams;
    expect([body.get("secret"), body.get("response"), body.get("remoteip")]).toEqual(["sec", "tok", "1.2.3.4"]);
  });
  it("omits remoteip for an unknown client address", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    await createTurnstileVerifier("sec", f as unknown as typeof fetch)("tok", UNKNOWN_IP);
    const body = (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.has("remoteip")).toBe(false);
  });
  it("rejects a token over 2048 characters without a network call", async () => {
    const f = vi.fn();
    expect(await createTurnstileVerifier("sec", f as unknown as typeof fetch)("t".repeat(2049), "1.2.3.4")).toEqual({ ok: false, reason: "no-token" });
    expect(f).not.toHaveBeenCalled();
  });
  it("is false for an empty token without calling the network", async () => {
    const f = vi.fn();
    expect(await createTurnstileVerifier("sec", f as unknown as typeof fetch)("", "1.2.3.4")).toEqual({ ok: false, reason: "no-token" });
    expect(f).not.toHaveBeenCalled();
  });
  it.each([
    ["success:false without codes", "rejected", async () => new Response(JSON.stringify({ success: false }))],
    ["error codes", "invalid-input-secret,timeout-or-duplicate", async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-secret", "timeout-or-duplicate"] }))],
    ["http 500", "500", async () => new Response("x", { status: 500 })],
    ["network error", "network", async () => { throw new Error("down"); }],
    ["not json", "network", async () => new Response("<html>")],
  ])("fails on %s with reason %s", async (_n, reason, impl) => {
    expect(await createTurnstileVerifier("sec", impl as unknown as typeof fetch)("tok", "1.2.3.4")).toEqual({ ok: false, reason });
  });
  it("keeps only well-formed error codes (nothing the remote side invents reaches the log)", async () => {
    const impl = async () => new Response(JSON.stringify({ success: false, "error-codes": ["bad-request", "Ada <ada@example.com>", 7, "x".repeat(41), "a", "b", "c", "d", "e"] }));
    expect(await createTurnstileVerifier("sec", impl as unknown as typeof fetch)("tok", "1.2.3.4")).toEqual({ ok: false, reason: "bad-request,a,b,c,d" });
  });
});

describe("createResendSender", () => {
  const cfg = { apiKey: "re_x", from: "Site <a@b.c>", to: "owner@b.c" };
  it("posts the e-mail as text with reply_to", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const ok = await createResendSender(cfg, f as unknown as typeof fetch)({ subject: "S", text: "T", replyTo: "v@x.y" });
    expect(ok).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_x");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Site <a@b.c>", to: ["owner@b.c"], subject: "S", text: "T", reply_to: "v@x.y" });
  });
  it("reports the HTTP status of a non-2xx answer, never its body, and a network error as such", async () => {
    const bad = createResendSender(cfg, (async () => new Response('{"message":"owner@b.c is not allowed"}', { status: 403 })) as unknown as typeof fetch);
    const down = createResendSender(cfg, (async () => { throw new Error("x"); }) as unknown as typeof fetch);
    expect(await bad({ subject: "S", text: "T", replyTo: "v@x.y" })).toEqual({ ok: false, reason: "403" });
    expect(await down({ subject: "S", text: "T", replyTo: "v@x.y" })).toEqual({ ok: false, reason: "network" });
  });
});

describe("submitContact", () => {
  it("sends one e-mail for a valid submission", async () => {
    const d = deps();
    expect(await submitContact(form(), d)).toEqual({ status: "success" });
    expect(d.verifyToken).toHaveBeenCalledWith("tok", "203.0.113.7");
    expect(d.send).toHaveBeenCalledTimes(1);
  });
  it("honeypot filled → silent success, nothing verified or sent, no rate-limit slot used", async () => {
    const d = deps();
    expect(await submitContact(form({ contact_ref: "Acme" }), d)).toEqual({ status: "success" });
    expect(d.verifyToken).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
    expect(d.limiter.size(d.now())).toBe(0);
  });
  it("invalid fields → error with field codes and values; no network", async () => {
    const d = deps();
    const r = await submitContact(form({ email: "x" }), d);
    expect(r).toMatchObject({ status: "error", code: "invalid", fieldErrors: { email: "invalid" }, values: { name: "Ada Lovelace", email: "x" } });
    expect(d.verifyToken).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });
  it("sixth submission from one IP within the hour → rate error, values kept", async () => {
    const d = deps();
    for (let i = 0; i < 5; i++) expect((await submitContact(form(), d)).status).toBe("success");
    const r = await submitContact(form(), d);
    expect(r).toMatchObject({ status: "error", code: "rate", values: { name: "Ada Lovelace" } });
    expect(d.send).toHaveBeenCalledTimes(5);
  });
  it("failed bot check → turnstile error, nothing sent", async () => {
    const d = deps({ verifyToken: vi.fn(async () => NO) });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "turnstile" });
    expect(d.send).not.toHaveBeenCalled();
  });
  it("send failure → send error and a log line without the message body", async () => {
    const d = deps({ send: vi.fn(async () => NO) });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "send" });
    expect(d.log).toHaveBeenCalledTimes(1);
    expect((d.log as ReturnType<typeof vi.fn>).mock.calls[0]![0]).not.toContain("I would like to talk");
  });
  it.each([["verifyToken"], ["send"]] as const)("missing %s outside dry run → unavailable (fail closed)", async (key) => {
    const d = deps({ [key]: null });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "unavailable" });
    if (key === "verifyToken") expect(d.send).not.toHaveBeenCalled();
  });
  it("dry run: validates and rate-limits but never verifies or sends", async () => {
    const verifyToken = vi.fn(async () => OK);
    const send = vi.fn(async () => OK);
    const d = deps({ dryRun: true, verifyToken, send });
    expect(await submitContact(form({ "cf-turnstile-response": "" }), d)).toEqual({ status: "success" });
    expect(verifyToken).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(d.limiter.size(d.now())).toBe(1);
    expect((await submitContact(form({ name: "" }), d)).status).toBe("error");
    for (let i = 0; i < 4; i++) expect((await submitContact(form(), d)).status).toBe("success");
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "rate" });
    expect(verifyToken).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("non-dry-run twin: verifier and sender are called, and the sixth call is rate limited", async () => {
    const d = deps();
    for (let i = 0; i < 5; i++) await submitContact(form(), d);
    expect(d.verifyToken).toHaveBeenCalledTimes(5);
    expect(d.send).toHaveBeenCalledTimes(5);
    expect(d.limiter.size(d.now())).toBe(1);
    expect(await submitContact(form(), d)).toMatchObject({ code: "rate" });
  });
  it("six invalid submissions do not consume rate slots", async () => {
    const d = deps();
    for (let i = 0; i < 6; i++) expect(await submitContact(form({ email: "x" }), d)).toMatchObject({ code: "invalid" });
    expect(await submitContact(form(), d)).toEqual({ status: "success" });
  });
  it("whitespace-only and File honeypots are bots → silent success", async () => {
    for (const trap of ["   ", new File(["x"], "a.txt")]) {
      const d = deps();
      expect(await submitContact(form({ contact_ref: trap }), d)).toEqual({ status: "success" });
      expect(d.verifyToken).not.toHaveBeenCalled();
      expect(d.send).not.toHaveBeenCalled();
    }
  });
  it("unknown client address outside dry run → unavailable, logged, nothing verified or sent", async () => {
    const d = deps({ ip: UNKNOWN_IP });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "unavailable" });
    expect(d.log).toHaveBeenCalledWith("contact: client address unavailable");
    expect(d.verifyToken).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
    expect(d.limiter.size(d.now())).toBe(0);
  });
  it("unknown client address in dry run is fine", async () => {
    expect(await submitContact(form(), deps({ ip: UNKNOWN_IP, dryRun: true }))).toEqual({ status: "success" });
  });
  it("later errors return the raw typed values, not trimmed ones", async () => {
    const d = deps({ verifyToken: vi.fn(async () => NO) });
    const r = await submitContact(form({ name: "  Ada  ", message: "  a long enough message  " }), d);
    expect(r).toMatchObject({ code: "turnstile", values: { name: "  Ada  ", message: "  a long enough message  " } });
  });
  it("logs never contain the name, e-mail or message", async () => {
    for (const d of [deps({ send: vi.fn(async () => NO) }), deps({ verifyToken: vi.fn(async () => NO) })]) {
      await submitContact(form(), d);
      const logs = (d.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0])).join("\n");
      expect(logs.length).toBeGreaterThan(0);
      for (const secret of ["Ada", "ada@example.com", "I would like to talk"]) expect(logs).not.toContain(secret);
    }
    const t = deps({ verifyToken: vi.fn(async () => NO) });
    await submitContact(form(), t);
    expect(t.log).toHaveBeenCalledWith("contact: turnstile rejected (403)");
  });
  it("logs the provider's HTTP status and the bot check's error codes", async () => {
    const s = deps({ send: vi.fn(async (): Promise<Outcome> => ({ ok: false, reason: "429" })) });
    await submitContact(form(), s);
    expect(s.log).toHaveBeenCalledWith("contact: mail provider rejected the message (429)");
    const v = deps({ verifyToken: vi.fn(async (): Promise<Outcome> => ({ ok: false, reason: "invalid-input-secret" })) });
    await submitContact(form(), v);
    expect(v.log).toHaveBeenCalledWith("contact: turnstile rejected (invalid-input-secret)");
  });
  it("names the missing variables when the deployment is not configured", async () => {
    const d = deps({ verifyToken: null, missing: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "unavailable" });
    expect(d.log).toHaveBeenCalledWith("contact: not configured (missing NEXT_PUBLIC_TURNSTILE_SITE_KEY)");
    expect(d.limiter.size(d.now())).toBe(0);
  });
  it("rate limit is per /64 for IPv6: a client rotating inside its prefix shares one bucket", async () => {
    const limiter = createRateLimiter(5, 3_600_000);
    for (let i = 0; i < 5; i++) {
      expect((await submitContact(form(), deps({ limiter, ip: `2001:db8:1:2::${i + 1}` }))).status).toBe("success");
    }
    expect(await submitContact(form(), deps({ limiter, ip: "2001:db8:1:2:aaaa:bbbb:cccc:dddd" }))).toMatchObject({ code: "rate" });
    expect((await submitContact(form(), deps({ limiter, ip: "2001:db8:1:3::1" }))).status).toBe("success");
    // The bot check still gets the full address.
    const d = deps({ ip: "2001:db8:1:2::9" });
    await submitContact(form(), d);
    expect(d.verifyToken).toHaveBeenCalledWith("tok", "2001:db8:1:2::9");
  });
});

describe("global fuse", () => {
  const from = (i: number) => `198.51.${Math.floor(i / 250)}.${1 + (i % 250)}`;
  it("31st accepted submission in an hour, from any client → unavailable with a log line, nothing sent", async () => {
    const fuse = createRateLimiter(30, 3_600_000);
    const send = vi.fn(async () => OK);
    for (let i = 0; i < 30; i++) expect((await submitContact(form(), deps({ fuse, send, ip: from(i) }))).status).toBe("success");
    const d = deps({ fuse, send, ip: from(30) });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "unavailable", values: { name: "Ada Lovelace" } });
    expect(d.log).toHaveBeenCalledWith("contact: global send ceiling reached");
    expect(send).toHaveBeenCalledTimes(30);
  });
  it("opens again when the hour has passed", async () => {
    const fuse = createRateLimiter(30, 3_600_000);
    for (let i = 0; i < 30; i++) await submitContact(form(), deps({ fuse, ip: from(i) }));
    expect(await submitContact(form(), deps({ fuse, ip: from(31) }))).toMatchObject({ code: "unavailable" });
    expect((await submitContact(form(), deps({ fuse, ip: from(32), now: () => 1_000_000 + 3_600_000 }))).status).toBe("success");
  });
  it("honeypot hits, invalid, rate-limited and bot-check failures do not count", async () => {
    const fuse = createRateLimiter(30, 3_600_000);
    const now = 1_000_000;
    for (let i = 0; i < 40; i++) {
      await submitContact(form({ contact_ref: "bot" }), deps({ fuse, ip: from(i) }));
      await submitContact(form({ email: "x" }), deps({ fuse, ip: from(i) }));
      await submitContact(form(), deps({ fuse, ip: from(i), verifyToken: vi.fn(async () => NO) }));
    }
    const limiter = createRateLimiter(0, 3_600_000);
    expect(await submitContact(form(), deps({ fuse, limiter }))).toMatchObject({ code: "rate" });
    expect(fuse.size(now)).toBe(0);
    await submitContact(form(), deps({ fuse }));
    expect(fuse.size(now)).toBe(1);
  });
  it("dry run sends nothing, so it never touches the fuse", async () => {
    const fuse = createRateLimiter(1, 3_600_000);
    for (let i = 0; i < 3; i++) expect((await submitContact(form(), deps({ fuse, dryRun: true, ip: from(i) }))).status).toBe("success");
    expect(fuse.size(1_000_000)).toBe(0);
  });
});

describe("rateKey", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    [" 203.0.113.7 ", "203.0.113.7"],
    ["::ffff:1.2.3.4", "1.2.3.4"],
    ["::FFFF:1.2.3.4", "1.2.3.4"],
    ["::ffff:102:304", "1.2.3.4"],
    ["0:0:0:0:0:ffff:1.2.3.4", "1.2.3.4"],
    ["2001:db8:1:2:3:4:5:6", "2001:db8:1:2::/64"],
    ["2001:0DB8:0001:0002::1", "2001:db8:1:2::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["[2001:db8:1:2::1]", "2001:db8:1:2::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
  ])("%j → %j", (ip, key) => expect(rateKey(ip)).toBe(key));
  it.each([
    "", "unknown", "garbage", "1.2.3", "1.2.3.4.5", "256.1.1.1", "1.2.3.4:8080", "1:2:3:4:5:6:7:8:9", "1::2::3", "12345::1",
    "g::1", ":::", "::ffff:999.1.1.1", "x".repeat(5000), "<script>",
  ])("garbage %j shares one bucket", (ip) => expect(rateKey(ip)).toBe("invalid"));
});

describe("typedValues", () => {
  it("caps the echoed budget like the other fields", () => {
    expect(typedValues(form({ budget: "x".repeat(100_000) })).budget).toHaveLength(16);
    expect(typedValues(form({ budget: "5k-15k" })).budget).toBe("5k-15k");
  });
});

describe("contactDepsFrom", () => {
  const FULL = { RESEND_API_KEY: "re_x", CONTACT_TO: "owner@b.c", TURNSTILE_SECRET_KEY: "sec", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site" };
  const shared = () => ({
    limiter: createRateLimiter(5, 3_600_000), fuse: createRateLimiter(30, 3_600_000), now: () => 1_000_000, log: vi.fn(),
    fetch: vi.fn(async () => new Response(JSON.stringify({ success: true }))) as unknown as typeof fetch,
  });
  const headers = (h: Record<string, string>) => (name: string) => h[name] ?? null;
  const build = (env: Record<string, string | undefined>, h: Record<string, string> = { "x-forwarded-for": "203.0.113.7" }) =>
    contactDepsFrom(env, headers(h), shared());

  it.each([
    [{ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }, "203.0.113.7"],
    [{ "x-forwarded-for": "  203.0.113.7  ,10.0.0.1" }, "203.0.113.7"],
    [{ "x-forwarded-for": "", "x-real-ip": "198.51.100.4" }, "198.51.100.4"],
    [{ "x-forwarded-for": " , 10.0.0.1", "x-real-ip": " 198.51.100.4 " }, "198.51.100.4"],
    [{ "x-real-ip": "198.51.100.4" }, "198.51.100.4"],
    [{ "x-forwarded-for": "", "x-real-ip": "  " }, UNKNOWN_IP],
    [{}, UNKNOWN_IP],
  ])("client address from %j → %s", (h, ip) => expect(build(FULL, h).ip).toBe(ip));

  it("dry run is honoured outside production only", () => {
    expect(build({ CONTACT_DRY_RUN: "1" }).dryRun).toBe(true);
    expect(build({ CONTACT_DRY_RUN: "1", VERCEL_ENV: "preview" }).dryRun).toBe(true);
    expect(build({ CONTACT_DRY_RUN: "1", VERCEL_ENV: "development" }).dryRun).toBe(true);
    expect(build({ CONTACT_DRY_RUN: "1", VERCEL_ENV: "production" }).dryRun).toBe(false);
    expect(build({ ...FULL, CONTACT_DRY_RUN: "1", VERCEL_ENV: "production" }).dryRun).toBe(false);
    for (const v of [undefined, "", "0", "true", "yes"]) expect(build({ CONTACT_DRY_RUN: v }).dryRun).toBe(false);
  });
  it("production with a leaked dry-run flag and no secrets fails closed", async () => {
    const d = build({ CONTACT_DRY_RUN: "1", VERCEL_ENV: "production" });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "unavailable" });
  });
  it("fully configured: verifier and sender exist, nothing missing", () => {
    const d = build(FULL);
    expect(d.verifyToken).toBeTypeOf("function");
    expect(d.send).toBeTypeOf("function");
    expect(d.missing).toEqual([]);
  });
  it.each([
    ["RESEND_API_KEY", "send"], ["CONTACT_TO", "send"], ["TURNSTILE_SECRET_KEY", "verifyToken"], ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "verifyToken"],
  ] as const)("missing or empty %s → %s is null and the variable is named", (name, dep) => {
    for (const value of [undefined, ""]) {
      const d = build({ ...FULL, [name]: value });
      expect(d[dep]).toBeNull();
      expect(d.missing).toEqual([name]);
    }
  });
  it("no secrets at all → both null", () => {
    const d = build({});
    expect([d.verifyToken, d.send]).toEqual([null, null]);
    expect(d.missing).toEqual(["RESEND_API_KEY", "CONTACT_TO", "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]);
  });
  it("secret present but no site key in the build → unavailable and logged, before the rate limiter, no network", async () => {
    const s = shared();
    const d = contactDepsFrom({ ...FULL, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" }, headers({ "x-forwarded-for": "203.0.113.7" }), s);
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "unavailable" });
    expect(s.log).toHaveBeenCalledWith("contact: not configured (missing NEXT_PUBLIC_TURNSTILE_SITE_KEY)");
    expect(s.limiter.size(1_000_000)).toBe(0);
    expect(s.fetch).not.toHaveBeenCalled();
  });
  it("sender uses the default CONTACT_FROM, or the configured one", async () => {
    for (const [from, expected] of [[undefined, "Portfolio <onboarding@resend.dev>"], ["", "Portfolio <onboarding@resend.dev>"], ["Site <contact@emindundar.dev>", "Site <contact@emindundar.dev>"]] as const) {
      const s = shared();
      const d = contactDepsFrom({ ...FULL, CONTACT_FROM: from }, headers({}), s);
      await d.send!({ subject: "S", text: "T", replyTo: "v@x.y" });
      const init = (s.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
      expect(JSON.parse(init.body as string)).toMatchObject({ from: expected, to: ["owner@b.c"] });
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_x");
    }
  });
  it("passes the shared limiter, fuse, clock and log through, and wires an end-to-end send", async () => {
    const s = shared();
    const d = contactDepsFrom(FULL, headers({ "x-forwarded-for": "203.0.113.7" }), s);
    expect([d.limiter, d.fuse, d.now, d.log]).toEqual([s.limiter, s.fuse, s.now, s.log]);
    expect(await submitContact(form(), d)).toEqual({ status: "success" });
    const urls = (s.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(urls).toEqual(["https://challenges.cloudflare.com/turnstile/v0/siteverify", "https://api.resend.com/emails"]);
  });
});
