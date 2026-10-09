import { z } from "zod";

export const BUDGETS = ["lt1k", "1k-5k", "5k-15k", "gt15k"] as const;
export type Budget = (typeof BUDGETS)[number];
export type ContactField = "name" | "email" | "message" | "budget";
export type FieldError = "required" | "tooShort" | "tooLong" | "invalid";
export type ContactValues = { name: string; email: string; message: string; budget: string };
export type ContactErrorCode = "invalid" | "turnstile" | "rate" | "unavailable" | "send";
export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: ContactErrorCode; fieldErrors?: Partial<Record<ContactField, FieldError>>; values: ContactValues };
export type ContactData = { name: string; email: string; message: string; budget?: Budget; locale: "en" | "tr" };
export type Email = { subject: string; text: string; replyTo: string };
export type RateLimiter = { hit(key: string, now: number): boolean; size(now: number): number };
/** `reason` goes to the server log: an HTTP status, Cloudflare error codes or a fixed word. Never visitor data. */
export type Outcome = { ok: true } | { ok: false; reason: string };
export type ContactDeps = {
  /** Full client address (sent to the bot check). The limiter keys on `rateKey(ip)`. */
  ip: string;
  now: () => number;
  /** Per client. */
  limiter: RateLimiter;
  /** Per instance, all clients together: caps real sends so the mail quota and the inbox survive a flood. */
  fuse: RateLimiter;
  verifyToken: ((token: string, ip: string) => Promise<Outcome>) | null;
  send: ((email: Email) => Promise<Outcome>) | null;
  dryRun: boolean;
  log: (message: string) => void;
  /** Names of the unset variables, for the "not configured" log line. */
  missing?: readonly string[];
};
/** Per-instance state and I/O the server action owns; everything else is derived per request. */
export type ContactShared = Pick<ContactDeps, "limiter" | "fuse" | "now" | "log"> & { fetch: typeof fetch };

// Not "company": browsers autofill that, and a real visitor would trip the trap.
export const HONEYPOT_FIELD = "contact_ref";
export const UNKNOWN_IP = "unknown";
export const DEFAULT_FROM = "Portfolio <onboarding@resend.dev>";
export const CLIENT_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 } as const;
export const GLOBAL_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 } as const;
const FUSE_KEY = "*";
const INVALID_IP_KEY = "invalid";
const MAX_RAW = 5000;
const MAX_BUDGET = 16;
const MAX_TOKEN = 2048;
export const TOKEN_FIELD = "cf-turnstile-response";

const NO_LINE_BREAK = /^[^\r\n\u0085\u2028\u2029]*$/;
// zod issue messages carry our own FieldError codes, so the UI never shows zod's English text.
const schema = z.object({
  name: z.string().trim().min(1, "required").min(2, "tooShort").max(80, "tooLong").regex(NO_LINE_BREAK, "invalid"),
  email: z.string().trim().min(1, "required").max(254, "tooLong").email("invalid"),
  message: z.string().trim().min(1, "required").min(10, "tooShort").max(2000, "tooLong"),
  budget: z.enum(BUDGETS, { message: "invalid" }).optional(),
});

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

const GUARDED = ["name", "email", "message"] as const;

/** What the visitor typed, untouched (capped at MAX_RAW), for refilling the form. */
export function typedValues(form: FormData): ContactValues {
  const cap = (v: string) => v.slice(0, MAX_RAW);
  return { name: cap(text(form, "name")), email: cap(text(form, "email")), message: cap(text(form, "message")), budget: text(form, "budget").slice(0, MAX_BUDGET) };
}

export function parseContact(form: FormData):
  | { ok: true; data: ContactData }
  | { ok: false; fieldErrors: Partial<Record<ContactField, FieldError>>; values: ContactValues } {
  const values = typedValues(form);
  // Pre-guard: never run zod (trim/regex/email) over a huge string.
  const tooLong = GUARDED.filter((f) => text(form, f).length > MAX_RAW);
  const parsed = schema.safeParse({
    ...values,
    ...Object.fromEntries(tooLong.map((f) => [f, ""])),
    budget: values.budget === "" ? undefined : values.budget,
  });
  if (!parsed.success || tooLong.length) {
    const fieldErrors: Partial<Record<ContactField, FieldError>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as ContactField;
        // First issue per field wins: "required" before "tooShort".
        fieldErrors[field] ??= issue.message as FieldError;
      }
    }
    for (const f of tooLong) fieldErrors[f] = "tooLong";
    return { ok: false, fieldErrors, values };
  }
  return { ok: true, data: { ...parsed.data, locale: text(form, "locale") === "tr" ? "tr" : "en" } };
}

export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  let nextSweep = 0;
  const sweep = (now: number) => {
    for (const [k, times] of hits) {
      const live = times.filter((t) => now - t < windowMs);
      if (live.length) hits.set(k, live);
      else hits.delete(k);
    }
    nextSweep = now + windowMs;
  };
  return {
    hit(key, now) {
      // Full sweep at most once per window; otherwise only the caller's own entries are filtered.
      if (now >= nextSweep) sweep(now);
      const mine = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (mine.length >= max) {
        hits.set(key, mine);
        return false;
      }
      mine.push(now);
      hits.set(key, mine);
      return true;
    },
    size(now) {
      sweep(now);
      return hits.size;
    },
  };
}

const ipv4 = (s: string): number[] | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n <= 255) ? parts : null;
};

/**
 * Rate-limit bucket for a client address. IPv4: the address. IPv6: its /64, because one subscriber owns the
 * whole prefix and can rotate through it at will. IPv4-mapped IPv6 (`::ffff:1.2.3.4`) counts as that IPv4
 * address. Anything unparsable shares one bucket, so junk can neither dodge the limit nor grow the map.
 */
export function rateKey(ip: string): string {
  let s = ip.trim().toLowerCase();
  if (s.length > 64) return INVALID_IP_KEY;
  const plain = ipv4(s);
  if (plain) return plain.join(".");
  s = s.replace(/^\[(.*)\]$/, "$1").replace(/%[^%]*$/, ""); // [brackets] and %zone
  const halves = s.split("::");
  if (!s.includes(":") || halves.length > 2) return INVALID_IP_KEY;
  const groups = halves.map((h) => (h === "" ? [] : h.split(":")));
  const tail = groups[groups.length - 1]!;
  const embedded = tail.length ? ipv4(tail[tail.length - 1]!) : null;
  if (embedded) {
    const [a, b, c, d] = embedded as [number, number, number, number];
    tail.splice(-1, 1, ((a << 8) | b).toString(16), ((c << 8) | d).toString(16));
  }
  const given = groups.flat();
  if (!given.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return INVALID_IP_KEY;
  if (halves.length === 2 ? given.length > 7 : given.length !== 8) return INVALID_IP_KEY;
  const head = groups[0]!;
  const full = [...head, ...Array<string>(8 - given.length).fill("0"), ...(halves.length === 2 ? tail : [])].map((g) => parseInt(g, 16));
  if (full.slice(0, 5).every((n) => n === 0) && full[5] === 0xffff) {
    return [full[6]! >> 8, full[6]! & 255, full[7]! >> 8, full[7]! & 255].join(".");
  }
  return `${full.slice(0, 4).map((n) => n.toString(16)).join(":")}::/64`;
}

export function buildEmail(data: Omit<ContactData, "locale"> & { locale: string }): Email {
  const lines = [`Name: ${data.name}`, `E-mail: ${data.email}`];
  if (data.budget) lines.push(`Budget: ${data.budget}`);
  lines.push(`Locale: ${data.locale}`, "", data.message);
  return { subject: `Portfolio contact: ${data.name.replace(/[\r\n]+/g, " ")}`, text: lines.join("\n"), replyTo: data.email };
}

export function createTurnstileVerifier(secret: string, fetchImpl: typeof fetch) {
  return async (token: string, ip: string): Promise<Outcome> => {
    if (!token || token.length > MAX_TOKEN) return { ok: false, reason: "no-token" };
    try {
      const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, ...(ip === UNKNOWN_IP ? {} : { remoteip: ip }) }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { ok: false, reason: String(res.status) };
      const json = (await res.json()) as { success?: unknown; "error-codes"?: unknown };
      if (json.success === true) return { ok: true };
      // Cloudflare's own codes (e.g. invalid-input-secret, timeout-or-duplicate). Only well-formed ones are kept.
      const raw: unknown[] = Array.isArray(json["error-codes"]) ? json["error-codes"] : [];
      const codes = raw.filter((c): c is string => typeof c === "string" && /^[a-z0-9-]{1,40}$/.test(c)).slice(0, 5);
      return { ok: false, reason: codes.join(",") || "rejected" };
    } catch {
      return { ok: false, reason: "network" };
    }
  };
}

export function createResendSender(cfg: { apiKey: string; from: string; to: string }, fetchImpl: typeof fetch) {
  return async (email: Email): Promise<Outcome> => {
    try {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: cfg.from, to: [cfg.to], subject: email.subject, text: email.text, reply_to: email.replyTo }),
        signal: AbortSignal.timeout(8000),
      });
      // Status only: the response body can quote the recipient address.
      return res.ok ? { ok: true } : { ok: false, reason: String(res.status) };
    } catch {
      return { ok: false, reason: "network" };
    }
  };
}

/**
 * Per-request wiring, kept here (and free of Next and `process.env`) so it can be tested: the action passes
 * its environment, a header getter and the per-instance state.
 */
export function contactDepsFrom(
  env: Readonly<Record<string, string | undefined>>,
  getHeader: (name: string) => string | null | undefined,
  shared: ContactShared,
): ContactDeps {
  // On Vercel, x-forwarded-for is overwritten with the real client address, so the first entry is trustworthy.
  // On any other host the header is client-supplied and spoofable (the limiter can then be evaded).
  const ip = getHeader("x-forwarded-for")?.split(",")[0]?.trim() || getHeader("x-real-ip")?.trim() || UNKNOWN_IP;
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, CONTACT_DRY_RUN, VERCEL_ENV } = env;
  const missing = Object.entries({ RESEND_API_KEY, CONTACT_TO, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  return {
    ip,
    now: shared.now,
    limiter: shared.limiter,
    fuse: shared.fuse,
    // Without a site key the page renders no widget, so no visitor could ever pass: that is "not configured",
    // not a failed bot check.
    verifyToken: TURNSTILE_SECRET_KEY && NEXT_PUBLIC_TURNSTILE_SITE_KEY ? createTurnstileVerifier(TURNSTILE_SECRET_KEY, shared.fetch) : null,
    send:
      RESEND_API_KEY && CONTACT_TO
        ? createResendSender({ apiKey: RESEND_API_KEY, from: CONTACT_FROM || DEFAULT_FROM, to: CONTACT_TO }, shared.fetch)
        : null,
    // Dry run is for local/preview demos only: it skips the bot check and mail, so it must never be
    // honoured in production even if the variable leaks into that environment.
    dryRun: CONTACT_DRY_RUN === "1" && VERCEL_ENV !== "production",
    log: shared.log,
    missing,
  };
}

export async function submitContact(form: FormData, deps: ContactDeps): Promise<ContactState> {
  // 1. Honeypot: bots get a success they cannot distinguish from a real one.
  // Any non-empty value (even whitespace or a File) marks a bot.
  const trap = form.get(HONEYPOT_FIELD);
  if (trap !== null && trap !== "") return { status: "success" };

  // 2. Validation first: a typo must not cost the visitor a rate-limit slot or a bot-check token.
  const parsed = parseContact(form);
  if (!parsed.ok) return { status: "error", code: "invalid", fieldErrors: parsed.fieldErrors, values: parsed.values };
  const values = typedValues(form);
  const fail = (code: ContactErrorCode): ContactState => ({ status: "error", code, values });

  // 3. Fail closed when the deployment is not configured.
  if (!deps.dryRun && (!deps.verifyToken || !deps.send)) {
    deps.log(`contact: not configured (missing ${deps.missing?.join(", ") || "Turnstile or mail settings"})`);
    return fail("unavailable");
  }

  // Without a client address one bucket would be shared by everyone (or none): fail closed.
  if (!deps.dryRun && deps.ip === UNKNOWN_IP) {
    deps.log("contact: client address unavailable");
    return fail("unavailable");
  }

  // 4. Rate limit.
  if (!deps.limiter.hit(rateKey(deps.ip), deps.now())) return fail("rate");

  if (deps.dryRun) {
    deps.log("contact: dry run, nothing sent");
    return { status: "success" };
  }

  // 5. Bot check.
  const verified = await deps.verifyToken!(text(form, TOKEN_FIELD), deps.ip);
  if (!verified.ok) {
    deps.log(`contact: turnstile rejected (${verified.reason})`);
    return fail("turnstile");
  }

  // 6. Global fuse. Counted only here, after the bot check: requests without a valid token cannot trip it
  // and lock everyone else out, and whatever does get through is capped across all clients.
  if (!deps.fuse.hit(FUSE_KEY, deps.now())) {
    deps.log("contact: global send ceiling reached");
    return fail("unavailable");
  }

  // 7. Send.
  const sent = await deps.send!(buildEmail(parsed.data));
  if (!sent.ok) {
    deps.log(`contact: mail provider rejected the message (${sent.reason})`);
    return fail("send");
  }
  return { status: "success" };
}
