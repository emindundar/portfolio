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
export type RateLimiter = { hit(key: string, now: number): boolean; size(): number };
export type ContactDeps = {
  ip: string;
  now: () => number;
  limiter: RateLimiter;
  verifyToken: ((token: string, ip: string) => Promise<boolean>) | null;
  send: ((email: Email) => Promise<boolean>) | null;
  dryRun: boolean;
  log: (message: string) => void;
};

export const HONEYPOT_FIELD = "company";
export const TOKEN_FIELD = "cf-turnstile-response";

const NO_LINE_BREAK = /^[^\r\n]*$/;
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

export function parseContact(form: FormData):
  | { ok: true; data: ContactData }
  | { ok: false; fieldErrors: Partial<Record<ContactField, FieldError>>; values: ContactValues } {
  const values: ContactValues = { name: text(form, "name"), email: text(form, "email"), message: text(form, "message"), budget: text(form, "budget") };
  const parsed = schema.safeParse({ ...values, budget: values.budget === "" ? undefined : values.budget });
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, FieldError>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField;
      // First issue per field wins: "required" before "tooShort".
      fieldErrors[field] ??= issue.message as FieldError;
    }
    return { ok: false, fieldErrors, values };
  }
  return { ok: true, data: { ...parsed.data, locale: text(form, "locale") === "tr" ? "tr" : "en" } };
}

export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, now) {
      // Sweep expired keys on every call; the map only ever holds IPs seen within one window.
      for (const [k, times] of hits) {
        const live = times.filter((t) => now - t < windowMs);
        if (live.length) hits.set(k, live);
        else hits.delete(k);
      }
      const mine = hits.get(key) ?? [];
      if (mine.length >= max) return false;
      hits.set(key, [...mine, now]);
      return true;
    },
    size: () => hits.size,
  };
}

export function buildEmail(data: Omit<ContactData, "locale"> & { locale: string }): Email {
  const lines = [`Name: ${data.name}`, `E-mail: ${data.email}`];
  if (data.budget) lines.push(`Budget: ${data.budget}`);
  lines.push(`Locale: ${data.locale}`, "", data.message);
  return { subject: `Portfolio contact: ${data.name.replace(/[\r\n]+/g, " ")}`, text: lines.join("\n"), replyTo: data.email };
}

export function createTurnstileVerifier(secret: string, fetchImpl: typeof fetch) {
  return async (token: string, ip: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { success?: unknown };
      return json.success === true;
    } catch {
      return false;
    }
  };
}

export function createResendSender(cfg: { apiKey: string; from: string; to: string }, fetchImpl: typeof fetch) {
  return async (email: Email): Promise<boolean> => {
    try {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: cfg.from, to: [cfg.to], subject: email.subject, text: email.text, reply_to: email.replyTo }),
        signal: AbortSignal.timeout(8000),
      });
      return res.ok;
    } catch {
      return false;
    }
  };
}

export async function submitContact(form: FormData, deps: ContactDeps): Promise<ContactState> {
  // 1. Honeypot: bots get a success they cannot distinguish from a real one.
  if (text(form, HONEYPOT_FIELD) !== "") return { status: "success" };

  // 2. Validation first: a typo must not cost the visitor a rate-limit slot or a bot-check token.
  const parsed = parseContact(form);
  if (!parsed.ok) return { status: "error", code: "invalid", fieldErrors: parsed.fieldErrors, values: parsed.values };
  const values: ContactValues = { name: parsed.data.name, email: parsed.data.email, message: parsed.data.message, budget: parsed.data.budget ?? "" };
  const fail = (code: ContactErrorCode): ContactState => ({ status: "error", code, values });

  // 3. Fail closed when the deployment is not configured.
  if (!deps.dryRun && (!deps.verifyToken || !deps.send)) {
    deps.log("contact: not configured (missing Turnstile secret or mail settings)");
    return fail("unavailable");
  }

  // 4. Rate limit.
  if (!deps.limiter.hit(deps.ip, deps.now())) return fail("rate");

  if (deps.dryRun) {
    deps.log("contact: dry run, nothing sent");
    return { status: "success" };
  }

  // 5. Bot check, 6. send.
  if (!(await deps.verifyToken!(text(form, TOKEN_FIELD), deps.ip))) return fail("turnstile");
  if (!(await deps.send!(buildEmail(parsed.data)))) {
    deps.log("contact: mail provider rejected the message");
    return fail("send");
  }
  return { status: "success" };
}
