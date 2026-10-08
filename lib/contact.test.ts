import { describe, it, expect, vi } from "vitest";
import {
  HONEYPOT_FIELD, UNKNOWN_IP, buildEmail, createRateLimiter, createResendSender, createTurnstileVerifier,
  parseContact, submitContact, type ContactDeps,
} from "./contact";

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
    ip: "203.0.113.7", now: () => 1_000_000, limiter: createRateLimiter(5, 3_600_000),
    verifyToken: vi.fn(async () => true), send: vi.fn(async () => true), dryRun: false, log: vi.fn(), ...over,
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
    expect(ok).toBe(true);
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
    expect(await createTurnstileVerifier("sec", f as unknown as typeof fetch)("t".repeat(2049), "1.2.3.4")).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("is false for an empty token without calling the network", async () => {
    const f = vi.fn();
    expect(await createTurnstileVerifier("sec", f as unknown as typeof fetch)("", "1.2.3.4")).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it.each([
    ["success:false", async () => new Response(JSON.stringify({ success: false }))],
    ["http 500", async () => new Response("x", { status: 500 })],
    ["network error", async () => { throw new Error("down"); }],
    ["not json", async () => new Response("<html>")],
  ])("is false on %s", async (_n, impl) => {
    expect(await createTurnstileVerifier("sec", impl as unknown as typeof fetch)("tok", "1.2.3.4")).toBe(false);
  });
});

describe("createResendSender", () => {
  const cfg = { apiKey: "re_x", from: "Site <a@b.c>", to: "owner@b.c" };
  it("posts the e-mail as text with reply_to", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const ok = await createResendSender(cfg, f as unknown as typeof fetch)({ subject: "S", text: "T", replyTo: "v@x.y" });
    expect(ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_x");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Site <a@b.c>", to: ["owner@b.c"], subject: "S", text: "T", reply_to: "v@x.y" });
  });
  it("is false on a non-2xx answer or a network error", async () => {
    const bad = createResendSender(cfg, (async () => new Response("no", { status: 422 })) as unknown as typeof fetch);
    const down = createResendSender(cfg, (async () => { throw new Error("x"); }) as unknown as typeof fetch);
    expect(await bad({ subject: "S", text: "T", replyTo: "v@x.y" })).toBe(false);
    expect(await down({ subject: "S", text: "T", replyTo: "v@x.y" })).toBe(false);
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
    const d = deps({ verifyToken: vi.fn(async () => false) });
    expect(await submitContact(form(), d)).toMatchObject({ status: "error", code: "turnstile" });
    expect(d.send).not.toHaveBeenCalled();
  });
  it("send failure → send error and a log line without the message body", async () => {
    const d = deps({ send: vi.fn(async () => false) });
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
    const verifyToken = vi.fn(async () => true);
    const send = vi.fn(async () => true);
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
    const d = deps({ verifyToken: vi.fn(async () => false) });
    const r = await submitContact(form({ name: "  Ada  ", message: "  a long enough message  " }), d);
    expect(r).toMatchObject({ code: "turnstile", values: { name: "  Ada  ", message: "  a long enough message  " } });
  });
  it("logs never contain the name, e-mail or message", async () => {
    for (const d of [deps({ send: vi.fn(async () => false) }), deps({ verifyToken: vi.fn(async () => false) })]) {
      await submitContact(form(), d);
      const logs = (d.log as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0])).join("\n");
      expect(logs.length).toBeGreaterThan(0);
      for (const secret of ["Ada", "ada@example.com", "I would like to talk"]) expect(logs).not.toContain(secret);
    }
    const t = deps({ verifyToken: vi.fn(async () => false) });
    await submitContact(form(), t);
    expect(t.log).toHaveBeenCalledWith("contact: turnstile rejected");
  });
});
