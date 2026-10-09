# Faz 1c: Contact Form, "Now" Panel and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/[locale]/contact` (form that e-mails the owner, bot-protected), the home-page "now" panel (manual status + live GitHub signal) and cookieless analytics, closing the last dead link on the site.

**Architecture:** All contact logic is a pure, dependency-injected pipeline in `lib/contact.ts` (honeypot → rate limit → validation → Turnstile → send); the Server Action only wires environment, headers and `fetch` into it. The form is one client component using `useActionState`; it works without JavaScript except for the bot check. The "now" panel is a server component whose GitHub data comes from a `"use cache"` function (1 h lifetime) that returns `null` on any failure, so the page stays static and the build never breaks. Analytics is a single conditional `next/script`.

**Tech Stack:** Next.js 16.4 (cacheComponents, Server Actions, `use cache` + `cacheLife`), React 19.3 `useActionState`, zod, Resend REST API (plain `fetch`, no SDK), Cloudflare Turnstile (explicit render), Umami Cloud, next-intl, Velite, Vitest, Playwright, LHCI.

**Spec:** `docs/superpowers/specs/2026-10-07-portfolio-design.md` — §2.1 (contact page), §2.6 ("now" panel), §4.4 (contact form order, GitHub panel), §4.6 (analytics), §4.9 (error handling), §4.10 (tests), §4.11 (secrets). `CLAUDE.md` rules and "Learned constraints" are binding.

## Global Constraints

- Locales `en` (default) and `tr`. Every user-facing string goes through `messages/{en,tr}.json`; key sets must stay identical (`lib/messages.test.ts`).
- Pages and layouts are server components. `"use client"` only where CLAUDE.md allows it (forms are allowed): the new client files are `components/contact/ContactForm.tsx` and `components/contact/Turnstile.tsx`.
- Tokens only: `bg, surface, line, fg, muted, accent`. No arbitrary colours, no border-radius, no shadows. Fonts via `font-display` / `font-sans` / `font-mono`.
- `cacheComponents: true`: no `new Date()`, `fetch`, `cookies()` or `headers()` in page/layout render outside a `"use cache"` scope. `headers()` is allowed inside the Server Action.
- Contact pipeline order is fixed by spec §4.4: honeypot filled → silent success; Turnstile verified on the server; zod: name 2–80, e-mail, message 10–2000, budget optional enum; rate limit 5 submissions/hour per IP, in-memory `Map`.
- Fail closed: if a required secret is missing in a non-dry-run environment the form reports "unavailable"; it never sends unverified mail and never pretends success.
- No API key or site id is committed. Form recipient and sender come from environment variables; the public contact address lives in `lib/site.ts` (owner decision).
- Performance budget: first-load JS ≤ 180 KB gz; LHCI total script ≤ 256 KB; CLS ≤ 0.05 (error gate); a11y ≥ 0.95; SEO = 1.
- Touch targets ≥ 44 px (`min-h-11`), visible focus, WCAG 2.1 AA.
- Tests: a test with every behaviour change; e2e waits on state, never on fixed sleeps. `pnpm build` before `pnpm e2e`. Ports 3100 (Playwright) / 3101 (LHCI).
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Deviations from the spec (need owner approval with this plan)

1. **"Now" panel always renders the manual line.** Spec §2.6 says the panel is not rendered when GitHub is unreachable. This plan renders the hand-written `content/now.json` line always and omits only the live GitHub row on failure. Reason: the manual line needs no network, and a panel that vanishes makes the page layout depend on GitHub's uptime at build time.
2. **Commit count comes from the commit search API**, not from the `events` feed. GitHub removed commit lists from public `PushEvent` payloads, so the feed can no longer be summed. Two unauthenticated requests per hour: `GET /users/emindundar/repos?sort=pushed&per_page=1` and `GET /search/commits?q=author:emindundar+author-date:>=<30 days ago>&per_page=1`.
3. **Sender address is configurable.** Spec says `contact@emindundar.dev`; the domain is not bought yet. `CONTACT_FROM` defaults to Resend's shared sender `onboarding@resend.dev`, which delivers only to the Resend account owner — exactly the recipient here.
4. **GitHub panel moves from Faz 1.5 to this phase** (already agreed when Faz 1 was split).
5. **E-mail link on the contact page.** Initially left out (a published address gets harvested); the owner decided on 2026-10-09 to publish it, so the page lists the address (`CONTACT_EMAIL` in `lib/site.ts`) next to LinkedIn and GitHub, as spec §2.1 says.

## Review Focus

1. A visitor double-clicks Submit or submits twice quickly → exactly one e-mail; the button is disabled while pending (Task 2 e2e + `useActionState` pending flag).
2. A visitor's message contains line breaks, `<script>` or a subject-like first line → the e-mail is plain text, the subject never contains a newline, nothing is interpreted as HTML (Task 1 unit test `buildEmail`).
3. Validation fails on one field → the other fields keep what the visitor typed, the first invalid field receives focus, and the error is announced (Task 2 e2e).
4. Turnstile script blocked (ad blocker, no JS) → the visitor gets a clear message with the LinkedIn fallback instead of a dead button (Task 2 unit + e2e no-JS).
5. GitHub answers 403 (rate limit), times out, or returns an unexpected shape → the home page still builds and renders, with the manual line only (Task 3 unit tests).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/contact.ts` | Pure contact pipeline: schema, rate limiter, Turnstile verifier, e-mail builder, Resend sender, `submitContact` orchestrator. No env access, no Next imports. |
| `lib/contact.test.ts` | Unit tests for every branch of the pipeline. |
| `app/[locale]/contact/actions.ts` | `"use server"` action: reads env + headers, calls `submitContact`. |
| `app/[locale]/contact/page.tsx` | Static page: heading, intro, form, direct links. |
| `components/contact/ContactForm.tsx` | Client form (`useActionState`), inline errors, status region. |
| `components/contact/Turnstile.tsx` | Client widget: loads Cloudflare script, explicit render, reset. |
| `lib/github.ts` | Pure GitHub fetch + transform (`fetchNowStats`), injected `fetch` and clock. |
| `lib/github.test.ts` | Transformer and failure-path tests. |
| `lib/now.ts` | `"use cache"` wrapper `getNowStats()` (1 h). |
| `content/now.json`, `content/schema-site.ts`, `velite.config.ts`, `lib/content/site.ts` | Manual "working on" line, `{en,tr}`. |
| `components/home/NowPanel.tsx` | Server component rendering the panel. |
| `components/layout/Analytics.tsx` | Conditional Umami script. |
| `e2e/contact.spec.ts`, `e2e/now.spec.ts` | Browser behaviour. |
| `.env.example`, `playwright.config.ts`, `lighthouserc.json`, `README.md`, `CLAUDE.md` | Config and docs. |

---

### Task 1: Contact pipeline (`lib/contact.ts`)

**Files:**
- Create: `lib/contact.ts`
- Test: `lib/contact.test.ts`
- Modify: `package.json` (add `zod`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 2):

```ts
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
export type ContactDeps = {
  ip: string;
  now: () => number;
  limiter: RateLimiter;
  /** null = bot check not configured */
  verifyToken: ((token: string, ip: string) => Promise<boolean>) | null;
  /** null = mail not configured */
  send: ((email: Email) => Promise<boolean>) | null;
  /** true only when CONTACT_DRY_RUN=1: skips token check and sending, everything else runs */
  dryRun: boolean;
  log: (message: string) => void;
};
export type Email = { subject: string; text: string; replyTo: string };
export function createRateLimiter(max: number, windowMs: number): RateLimiter;
export type RateLimiter = { hit(key: string, now: number): boolean; size(): number };
export function parseContact(form: FormData): { ok: true; data: {...} } | { ok: false; fieldErrors; values };
export function buildEmail(data: { name; email; message; budget?: Budget; locale: string }): Email;
export function createTurnstileVerifier(secret: string, fetchImpl: typeof fetch): (token: string, ip: string) => Promise<boolean>;
export function createResendSender(cfg: { apiKey: string; from: string; to: string }, fetchImpl: typeof fetch): (email: Email) => Promise<boolean>;
export async function submitContact(form: FormData, deps: ContactDeps): Promise<ContactState>;
```

Form field names (contract with Task 2): `name`, `email`, `message`, `budget`, `locale`, honeypot `company`, token `cf-turnstile-response`.

- [ ] **Step 1: Add zod**

Run: `pnpm add zod`
Expected: `zod` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing tests**

Create `lib/contact.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import {
  BUDGETS, buildEmail, createRateLimiter, createResendSender, createTurnstileVerifier,
  parseContact, submitContact, type ContactDeps,
} from "./contact";

function form(over: Record<string, string> = {}): FormData {
  const f = new FormData();
  const base = {
    name: "Ada Lovelace", email: "ada@example.com", message: "I would like to talk about a project.",
    budget: "", locale: "en", company: "", "cf-turnstile-response": "tok",
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
  it("exposes four budgets", () => expect(BUDGETS).toHaveLength(4));
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
    expect(l.size()).toBe(1);
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
    expect(await submitContact(form({ company: "Acme" }), d)).toEqual({ status: "success" });
    expect(d.verifyToken).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
    expect(d.limiter.size()).toBe(0);
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
    const d = deps({ dryRun: true, verifyToken: null, send: null });
    expect(await submitContact(form({ "cf-turnstile-response": "" }), d)).toEqual({ status: "success" });
    expect((await submitContact(form({ name: "" }), d)).status).toBe("error");
  });
});
```

- [ ] **Step 3: Run the tests, confirm they fail**

Run: `pnpm vitest run lib/contact.test.ts`
Expected: FAIL — `Failed to resolve import "./contact"`.

- [ ] **Step 4: Implement `lib/contact.ts`**

```ts
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
```

Note on order: the spec lists Turnstile before zod. Validation runs first here because a Turnstile token is single-use — verifying it before validation would force a fresh challenge after every typo. No unverified data leaves the server either way; record this in the task report.

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm vitest run lib/contact.test.ts && pnpm lint && pnpm typecheck`
Expected: all tests PASS, lint and types clean. If zod's `z.enum(..., { message })` signature differs in the installed major, use the equivalent that yields issue message `"invalid"` and keep the tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/contact.ts lib/contact.test.ts
git commit -m "feat(contact): validated, rate-limited, bot-checked contact pipeline"
```

---

### Task 2: Contact page, form and Server Action

**Files:**
- Create: `app/[locale]/contact/actions.ts`, `app/[locale]/contact/page.tsx`, `components/contact/ContactForm.tsx`, `components/contact/Turnstile.tsx`, `components/contact/ContactForm.test.tsx`, `e2e/contact.spec.ts`
- Modify: `messages/en.json`, `messages/tr.json` (new `Contact` namespace), `playwright.config.ts` (webServer env), `lighthouserc.json` (start command env + URL), `.env.example`

**Interfaces:**
- Consumes (Task 1): `submitContact`, `createRateLimiter`, `createTurnstileVerifier`, `createResendSender`, `ContactState`, `BUDGETS`, `HONEYPOT_FIELD`, `ContactField`, `FieldError`.
- Produces: `sendContact(prev: ContactState, form: FormData): Promise<ContactState>` (Server Action); `<ContactForm locale siteKey />`; test hooks `form[data-contact-form]`, `[data-contact-status="success|error"]`.

Environment contract (all optional; documented in `.env.example`):

| Variable | Meaning |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `CONTACT_TO` | recipient mailbox |
| `CONTACT_FROM` | sender, default `Portfolio <onboarding@resend.dev>` |
| `TURNSTILE_SECRET_KEY` | server secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | widget key |
| `CONTACT_DRY_RUN` | `1` = validate and rate-limit only; for e2e and local work |

- [ ] **Step 1: Messages**

Add to `messages/en.json`:

```json
"Contact": {
  "title": "Contact",
  "description": "Tell me about a role or a project. I reply within two working days.",
  "intro": "A role, a freelance project or a question about something I built: write a few lines and I will get back to you.",
  "name": "Name",
  "email": "E-mail",
  "message": "Message",
  "messageHint": "10 to 2000 characters.",
  "budget": "Budget (optional)",
  "budgetNone": "Not sure yet",
  "budgetLt1k": "Under $1,000",
  "budget1k5k": "$1,000 – $5,000",
  "budget5k15k": "$5,000 – $15,000",
  "budgetGt15k": "Over $15,000",
  "company": "Company (leave this empty)",
  "submit": "Send message",
  "sending": "Sending…",
  "success": "Message sent. I will reply to the address you gave.",
  "sendAnother": "Send another message",
  "errorInvalid": "Some fields need attention.",
  "errorTurnstile": "The bot check did not complete. Reload the page and try again, or reach me on LinkedIn.",
  "errorRate": "Too many messages from this connection. Try again in an hour.",
  "errorUnavailable": "The form is not available right now. Please reach me on LinkedIn.",
  "errorSend": "The message could not be sent. Try again, or reach me on LinkedIn.",
  "fieldRequired": "This field is required.",
  "fieldTooShort": "This is too short.",
  "fieldTooLong": "This is too long.",
  "fieldInvalid": "This does not look right.",
  "elsewhere": "Elsewhere",
  "noScript": "The bot check needs JavaScript. Without it, please reach me on LinkedIn."
}
```

Add to `messages/tr.json`:

```json
"Contact": {
  "title": "İletişim",
  "description": "Bir pozisyon ya da projeden bahsedin. İki iş günü içinde dönüş yaparım.",
  "intro": "Bir pozisyon, serbest bir proje ya da geliştirdiğim bir işle ilgili soru: birkaç satır yazın, size dönüş yapayım.",
  "name": "Ad",
  "email": "E-posta",
  "message": "Mesaj",
  "messageHint": "10 ile 2000 karakter arası.",
  "budget": "Bütçe (isteğe bağlı)",
  "budgetNone": "Henüz belli değil",
  "budgetLt1k": "1.000 $ altı",
  "budget1k5k": "1.000 – 5.000 $",
  "budget5k15k": "5.000 – 15.000 $",
  "budgetGt15k": "15.000 $ üzeri",
  "company": "Şirket (bu alanı boş bırakın)",
  "submit": "Mesajı gönder",
  "sending": "Gönderiliyor…",
  "success": "Mesajınız gönderildi. Verdiğiniz adrese dönüş yapacağım.",
  "sendAnother": "Yeni mesaj gönder",
  "errorInvalid": "Bazı alanların düzeltilmesi gerekiyor.",
  "errorTurnstile": "Bot kontrolü tamamlanamadı. Sayfayı yenileyip tekrar deneyin ya da LinkedIn'den ulaşın.",
  "errorRate": "Bu bağlantıdan çok fazla mesaj gönderildi. Bir saat sonra tekrar deneyin.",
  "errorUnavailable": "Form şu anda kullanılamıyor. Lütfen LinkedIn'den ulaşın.",
  "errorSend": "Mesaj gönderilemedi. Tekrar deneyin ya da LinkedIn'den ulaşın.",
  "fieldRequired": "Bu alan zorunlu.",
  "fieldTooShort": "Çok kısa.",
  "fieldTooLong": "Çok uzun.",
  "fieldInvalid": "Bu değer geçerli görünmüyor.",
  "elsewhere": "Diğer kanallar",
  "noScript": "Bot kontrolü JavaScript gerektirir. JavaScript kapalıysa lütfen LinkedIn'den ulaşın."
}
```

Run: `pnpm vitest run lib/messages.test.ts` — Expected: PASS (key parity).

- [ ] **Step 2: Server Action**

Create `app/[locale]/contact/actions.ts`:

```ts
"use server";

import { headers } from "next/headers";
import {
  createRateLimiter, createResendSender, createTurnstileVerifier, submitContact, type ContactState,
} from "@/lib/contact";

// Module scope: one limiter per server instance (spec §4.4: in-memory, per instance, paired with Turnstile).
const limiter = createRateLimiter(5, 60 * 60 * 1000);

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const h = await headers();
  // Vercel sets x-forwarded-for; the first entry is the client.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM, TURNSTILE_SECRET_KEY, CONTACT_DRY_RUN } = process.env;
  return submitContact(form, {
    ip,
    now: Date.now,
    limiter,
    verifyToken: TURNSTILE_SECRET_KEY ? createTurnstileVerifier(TURNSTILE_SECRET_KEY, fetch) : null,
    send:
      RESEND_API_KEY && CONTACT_TO
        ? createResendSender({ apiKey: RESEND_API_KEY, from: CONTACT_FROM || "Portfolio <onboarding@resend.dev>", to: CONTACT_TO }, fetch)
        : null,
    dryRun: CONTACT_DRY_RUN === "1",
    log: (m) => console.error(m),
  });
}
```

- [ ] **Step 3: Turnstile widget**

Create `components/contact/Turnstile.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile script failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

type Props = { siteKey: string; locale: string; resetKey: number; onUnavailable: () => void };

/** Renders the widget inside the surrounding <form>; Cloudflare adds the hidden `cf-turnstile-response` input itself. */
export function Turnstile({ siteKey, locale, resetKey, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !host.current || !window.turnstile) return;
        id.current = window.turnstile.render(host.current, {
          sitekey: siteKey,
          language: locale,
          theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
          appearance: "interaction-only",
          size: "flexible",
          "error-callback": onUnavailable,
        });
      })
      .catch(onUnavailable);
    return () => {
      cancelled = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [siteKey, locale, onUnavailable]);

  // A token is single-use: after every server answer the parent bumps resetKey to get a fresh one.
  useEffect(() => {
    if (resetKey > 0 && id.current && window.turnstile) window.turnstile.reset(id.current);
  }, [resetKey]);

  return <div ref={host} data-turnstile />;
}
```

- [ ] **Step 4: Failing component test**

Create `components/contact/ContactForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { ContactState } from "@/lib/contact";

const state = vi.hoisted(() => ({ current: { status: "idle" } as ContactState, pending: false }));
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useActionState: () => [state.current, vi.fn(), state.pending],
}));
vi.mock("@/app/[locale]/contact/actions", () => ({ sendContact: vi.fn() }));

import { ContactForm } from "./ContactForm";

function show(s: ContactState, pending = false) {
  state.current = s;
  state.pending = pending;
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContactForm locale="en" siteKey="" linkedinUrl="https://www.linkedin.com/in/emindundar" />
    </NextIntlClientProvider>,
  );
}

describe("ContactForm", () => {
  it("idle: labelled fields, hidden honeypot out of the tab order, no status", () => {
    const { container } = show({ status: "idle" });
    expect(screen.getByLabelText("Name")).toBeRequired();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "2000");
    const trap = container.querySelector('input[name="company"]')!;
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelector("[data-contact-status]")).toBeNull();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });
  it("pending: button disabled and renamed", () => {
    show({ status: "idle" }, true);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });
  it("field errors: refilled values, aria-invalid, described by the error, alert summary", () => {
    show({ status: "error", code: "invalid", fieldErrors: { email: "invalid" }, values: { name: "Ada", email: "nope", message: "hello hello hello", budget: "1k-5k" } });
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveValue("nope");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(email.getAttribute("aria-describedby")!)).toHaveTextContent("This does not look right.");
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Budget (optional)")).toHaveValue("1k-5k");
    expect(screen.getByRole("alert")).toHaveTextContent("Some fields need attention.");
  });
  it("unavailable: message plus a LinkedIn link", () => {
    show({ status: "error", code: "unavailable", values: { name: "", email: "", message: "", budget: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("The form is not available right now.");
    expect(screen.getByRole("alert").querySelector("a")).toHaveAttribute("href", "https://www.linkedin.com/in/emindundar");
  });
  it("success: form replaced by a status message that takes focus", () => {
    const { container } = show({ status: "success" });
    expect(container.querySelector("form")).toBeNull();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Message sent.");
    expect(status).toHaveFocus();
  });
});
```

Run: `pnpm vitest run components/contact/ContactForm.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 5: Implement the form**

Create `components/contact/ContactForm.tsx`:

```tsx
"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sendContact } from "@/app/[locale]/contact/actions";
import { BUDGETS, HONEYPOT_FIELD, type ContactField, type ContactState, type FieldError } from "@/lib/contact";
import { buttonClasses } from "@/components/ui/Button";
import { Turnstile } from "./Turnstile";

const FIELD_ERROR_KEY = { required: "fieldRequired", tooShort: "fieldTooShort", tooLong: "fieldTooLong", invalid: "fieldInvalid" } as const satisfies Record<FieldError, string>;
const ERROR_KEY = { invalid: "errorInvalid", turnstile: "errorTurnstile", rate: "errorRate", unavailable: "errorUnavailable", send: "errorSend" } as const;
const BUDGET_KEY = { lt1k: "budgetLt1k", "1k-5k": "budget1k5k", "5k-15k": "budget5k15k", gt15k: "budgetGt15k" } as const;
const LINKED_CODES = new Set(["turnstile", "unavailable", "send"]);
const FIELD_ORDER: ContactField[] = ["name", "email", "message", "budget"];

const control = "w-full border border-line bg-surface px-3 py-3 font-sans text-base text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-accent";
const label = "mb-2 block font-mono text-xs uppercase tracking-wide text-muted";

type Props = { locale: string; siteKey: string; linkedinUrl: string };

export function ContactForm({ locale, siteKey, linkedinUrl }: Props) {
  const t = useTranslations("Contact");
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  const [round, setRound] = useState(0);
  const [botCheckDown, setBotCheckDown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const onUnavailable = useCallback(() => setBotCheckDown(true), []);

  // After each server answer: fresh bot-check token; move focus to the result.
  useEffect(() => {
    if (state.status === "idle") return;
    setRound((n) => n + 1);
    if (state.status === "success") {
      successRef.current?.focus();
      return;
    }
    const first = FIELD_ORDER.find((f) => state.fieldErrors?.[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <p ref={successRef} tabIndex={-1} role="status" data-contact-status="success" className="border border-line bg-surface p-6 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {t("success")}
      </p>
    );
  }

  const values = state.status === "error" ? state.values : { name: "", email: "", message: "", budget: "" };
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errorCode = state.status === "error" ? state.code : botCheckDown ? "turnstile" : null;

  const fieldProps = (field: ContactField) => {
    const code = fieldErrors[field];
    return {
      id: `contact-${field}`,
      name: field,
      "aria-invalid": code ? (true as const) : undefined,
      "aria-describedby": code ? `contact-${field}-error` : field === "message" ? "contact-message-hint" : undefined,
    };
  };
  const fieldError = (field: ContactField) => {
    const code = fieldErrors[field];
    return code ? <p id={`contact-${field}-error`} className="mt-2 text-sm text-accent">{t(FIELD_ERROR_KEY[code])}</p> : null;
  };

  return (
    // key={round}: remount so defaultValue picks up what the server sent back.
    <form key={round} ref={formRef} action={action} noValidate data-contact-form className="grid gap-6">
      {errorCode && (
        <p role="alert" data-contact-status="error" className="border border-accent p-4">
          {t(ERROR_KEY[errorCode])}{" "}
          {LINKED_CODES.has(errorCode) && (
            <a href={linkedinUrl} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4">LinkedIn</a>
          )}
        </p>
      )}
      <input type="hidden" name="locale" value={locale} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-company">{t("company")}</label>
        <input id="contact-company" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={label}>{t("name")}</label>
          <input {...fieldProps("name")} type="text" required minLength={2} maxLength={80} autoComplete="name" defaultValue={values.name} className={control} />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor="contact-email" className={label}>{t("email")}</label>
          <input {...fieldProps("email")} type="email" required maxLength={254} autoComplete="email" inputMode="email" defaultValue={values.email} className={control} />
          {fieldError("email")}
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className={label}>{t("message")}</label>
        <textarea {...fieldProps("message")} required minLength={10} maxLength={2000} rows={8} defaultValue={values.message} className={control} />
        <p id="contact-message-hint" className="mt-2 text-sm text-muted">{t("messageHint")}</p>
        {fieldError("message")}
      </div>
      <div className="md:max-w-sm">
        <label htmlFor="contact-budget" className={label}>{t("budget")}</label>
        <select {...fieldProps("budget")} defaultValue={values.budget} className={`${control} min-h-11`}>
          <option value="">{t("budgetNone")}</option>
          {BUDGETS.map((b) => <option key={b} value={b}>{t(BUDGET_KEY[b])}</option>)}
        </select>
        {fieldError("budget")}
      </div>
      {siteKey && <Turnstile siteKey={siteKey} locale={locale} resetKey={round} onUnavailable={onUnavailable} />}
      <noscript><p className="text-sm text-muted">{t("noScript")}</p></noscript>
      <div>
        <button type="submit" disabled={pending} className={buttonClasses("primary", "cursor-pointer disabled:cursor-wait disabled:opacity-60")}>
          {pending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}
```

Notes for the implementer:
- `-left-[9999px]` is an arbitrary *length*, not a colour; it is allowed. If the project lint rejects it, use the `sr-only` utility plus `aria-hidden` instead.
- `aria-describedby` on the message must list both the error and the hint when an error is present: change the helper so `message` returns `"contact-message-error contact-message-hint"` in that case, and extend the unit test with that assertion.
- `noValidate` is deliberate: the server is the single source of validation messages, so they are localized and announced consistently. The native attributes (`required`, `maxLength`) stay for assistive technology and for no-JS length capping.

Run: `pnpm vitest run components/contact/ContactForm.test.tsx` — Expected: PASS.

- [ ] **Step 6: Page**

Create `app/[locale]/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/site";
import { ContactForm } from "@/components/contact/ContactForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/contact", locale) };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Build-time constant: reading it at module scope keeps the page static.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Contact" });
  const tc = await getTranslations({ locale, namespace: "Case" });
  const links = [
    { href: LINKEDIN_URL, label: "LinkedIn" },
    { href: GITHUB_URL, label: "GitHub" },
  ];
  return (
    <main className="px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("intro")}</p>
      <div className="mt-12 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-8">
          <ContactForm locale={locale} siteKey={SITE_KEY} linkedinUrl={LINKEDIN_URL} />
        </div>
        <aside className="md:col-span-4">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-muted">{t("elsewhere")}</h2>
          <ul className="grid gap-1 font-mono text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  {l.label} <span aria-hidden="true">&nbsp;↗</span>
                  <span className="sr-only"> ({tc("newTab")})</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
```

Check how the existing pages render the "opens in a new tab" cue (grep `newTab` in `components/`) and reuse that exact markup instead of the one above if it differs.

- [ ] **Step 7: Test server env and LHCI URL**

`playwright.config.ts` — replace the `webServer` block with:

```ts
  webServer: {
    command: "pnpm exec next start -p 3100",
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The contact action validates and rate-limits but never calls Cloudflare or Resend.
    env: { CONTACT_DRY_RUN: "1" },
  },
```

`lighthouserc.json` — add `"http://localhost:3101/en/contact"` to `ci.collect.url`.

`.env.example` — replace the file with:

```bash
# Contact form (Faz 1c). All optional: without them the form answers "unavailable" and points to LinkedIn.
RESEND_API_KEY=
CONTACT_TO=
# Default: Portfolio <onboarding@resend.dev> (delivers only to the Resend account owner). Use contact@<domain> once the domain is verified.
CONTACT_FROM=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
# 1 = validate and rate-limit, never verify or send (local work, e2e). Never set in production.
CONTACT_DRY_RUN=
# Analytics (Faz 1c)
NEXT_PUBLIC_UMAMI_ID=
```

- [ ] **Step 8: e2e**

Create `e2e/contact.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

// The server keeps one in-memory limiter (5/hour/IP). Every test uses its own forwarded IP so runs never collide.
let n = 0;
async function open(page: Page, path = "/en/contact") {
  const ip = `198.51.100.${(n++ % 200) + 1}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `${ip}, 10.0.0.${test.info().workerIndex + 1}` });
  await page.goto(path);
  await expect(page.locator("form[data-contact-form]")).toBeVisible();
}
async function fill(page: Page, over: Partial<Record<"Name" | "E-mail" | "Message", string>> = {}) {
  const v = { Name: "Ada Lovelace", "E-mail": "ada@example.com", Message: "I would like to talk about a project.", ...over };
  for (const [label, value] of Object.entries(v)) await page.getByLabel(label, { exact: true }).fill(value);
}

test.describe("/contact", () => {
  test("valid submission shows the success status and removes the form", async ({ page }) => {
    await open(page);
    await fill(page);
    await page.getByRole("button", { name: "Send message" }).click();
    const status = page.locator('[data-contact-status="success"]');
    await expect(status).toHaveText(/Message sent/);
    await expect(status).toBeFocused();
    await expect(page.locator("form[data-contact-form]")).toHaveCount(0);
  });

  test("invalid e-mail: inline error, focus on the field, other values kept", async ({ page }) => {
    await open(page);
    await fill(page, { "E-mail": "not-an-email" });
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert")).toHaveText(/Some fields need attention/);
    const email = page.getByLabel("E-mail", { exact: true });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toBeFocused();
    await expect(email).toHaveValue("not-an-email");
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("I would like to talk about a project.");
  });

  test("honeypot filled: looks like success, and is invisible and unreachable for people", async ({ page }) => {
    await open(page);
    const trap = page.locator('input[name="company"]');
    await expect(trap).not.toBeInViewport();
    await fill(page);
    await trap.evaluate((el: HTMLInputElement) => { el.value = "Acme Bots Ltd"; });
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
  });

  test("keyboard only: tab order skips the honeypot and Enter on the button submits", async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "hardware keyboard flow");
    await open(page);
    await page.getByLabel("Name", { exact: true }).focus();
    await page.keyboard.type("Ada Lovelace");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
    await page.keyboard.type("ada@example.com");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Message", { exact: true })).toBeFocused();
    await page.keyboard.type("I would like to talk about a project.");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Budget (optional)")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Send message" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
  });

  test("sixth message in an hour from one address is refused, text kept", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.250" });
    for (let i = 0; i < 5; i++) {
      await page.goto("/en/contact");
      await fill(page);
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
    }
    await page.goto("/en/contact");
    await fill(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert")).toHaveText(/Too many messages/);
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("I would like to talk about a project.");
  });

  test("tr is localized and nav marks the page current", async ({ page }) => {
    await open(page, "/tr/contact");
    await expect(page.getByRole("heading", { level: 1, name: "İletişim" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mesajı gönder" })).toBeVisible();
    await expect(page).toHaveTitle(/İletişim/);
    await expect(page.getByRole("navigation", { name: /ana gezinme/i }).getByRole("link", { name: "İletişim" })).toHaveAttribute("aria-current", "page");
  });

  test("fits 360px without horizontal scroll and controls are at least 44px tall", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const el of [page.getByLabel("Name", { exact: true }), page.getByLabel("Budget (optional)"), page.getByRole("button", { name: "Send message" })]) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("home and services CTAs reach the page (no more dead link)", async ({ page }) => {
    for (const from of ["/en", "/en/services"]) {
      await page.goto(from);
      const res = await page.request.get(await page.locator('main a[href="/en/contact"]').first().getAttribute("href") as string);
      expect(res.status()).toBe(200);
    }
  });
});

test.describe("/contact without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the form still posts and the server answers with the success page", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.251" });
    await page.goto("/en/contact");
    await fill(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
  });
});
```

The double-submit case (Review Focus 1) is covered by the `pending` unit test (button disabled while the action runs); do not add a timing-based e2e for it.

If the rate-limit test's fixed IP makes a locally re-run suite fail (reused server keeps the limiter), derive the address from `Date.now()` (`198.51.100.${200 + (Date.now() % 50)}`) and say so in the report.

- [ ] **Step 9: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: all clean; the build table lists `/[locale]/contact` as static (● SSG) — if it shows as dynamic, find the render-time env/header read and move it to module scope or into the action.

Run: `CONTACT_DRY_RUN=1 pnpm lhci` — wait: LHCI starts its own server and only loads pages (never submits), so no env is needed. Run `pnpm lhci`.
Expected: no error-level assertion fails on `/en/contact`; record performance, a11y, CLS and script transfer in the report.

Manual check with the browser (Playwright script or the dev tools): with `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (Cloudflare's always-pass test key) in `.env.local`, `pnpm build && pnpm start`, open `/en/contact`: the widget host `[data-turnstile]` contains an iframe or nothing visible (interaction-only), a hidden `cf-turnstile-response` input appears inside the form, and the console has no errors. Remove the key from `.env.local` afterwards. Report the outcome.

- [ ] **Step 10: Commit**

```bash
git add app/[locale]/contact components/contact e2e/contact.spec.ts messages playwright.config.ts lighthouserc.json .env.example
git commit -m "feat(contact): contact page with accessible form, server action, Turnstile widget"
```

---

### Task 3: "Now" panel (manual status + live GitHub signal)

**Files:**
- Create: `lib/github.ts`, `lib/github.test.ts`, `lib/now.ts`, `content/now.json`, `components/home/NowPanel.tsx`, `components/home/NowPanel.test.tsx`, `e2e/now.spec.ts`
- Modify: `content/schema-site.ts`, `velite.config.ts`, `lib/content/site.ts`, `app/[locale]/page.tsx`, `messages/en.json`, `messages/tr.json`, `lib/site.ts`

**Interfaces:**
- Consumes: `formatDate(iso: string, locale: Locale): string` from `lib/format.ts`; `localize` pattern in `lib/content/site.ts`.
- Produces:

```ts
// lib/site.ts
export const GITHUB_USER = "emindundar";
// lib/github.ts
export type NowStats = { repo: { name: string; url: string }; pushedAt: string /* YYYY-MM-DD, UTC */; commits30d: number | null };
export async function fetchNowStats(user: string, fetchImpl: typeof fetch, now: Date): Promise<NowStats | null>;
// lib/now.ts
export async function getNowStats(): Promise<NowStats | null>; // "use cache", 1 h
// lib/content/site.ts
export const getNow: (locale: Locale) => { updated: string; text: string };
```

- [ ] **Step 1: Failing GitHub tests**

Create `lib/github.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { fetchNowStats } from "./github";

const NOW = new Date("2026-10-08T12:00:00Z");
const repo = (over: object = {}) => ({ name: "portfolio", html_url: "https://github.com/emindundar/portfolio", pushed_at: "2026-10-07T21:14:03Z", fork: false, private: false, ...over });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function routes(map: { repos?: () => Response | Promise<Response>; search?: () => Response | Promise<Response> }) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes("/search/commits")) return (map.search ?? (() => json({ total_count: 42 })))();
    if (u.includes("/repos")) return (map.repos ?? (() => json([repo()])))();
    throw new Error(`unexpected url ${u}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("fetchNowStats", () => {
  it("returns the last pushed repo, its UTC date and the 30-day commit count", async () => {
    const f = routes({});
    expect(await fetchNowStats("emindundar", f, NOW)).toEqual({
      repo: { name: "portfolio", url: "https://github.com/emindundar/portfolio" }, pushedAt: "2026-10-07", commits30d: 42,
    });
  });
  it("asks for repos sorted by push and commits authored since 30 days ago", async () => {
    const f = routes({});
    await fetchNowStats("emindundar", f, NOW);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain("https://api.github.com/users/emindundar/repos?sort=pushed&direction=desc&per_page=10&type=owner");
    expect(urls.find((u) => u.includes("/search/commits"))).toBe(
      "https://api.github.com/search/commits?q=author%3Aemindundar+author-date%3A%3E%3D2026-09-08&per_page=1",
    );
    for (const c of f.mock.calls) expect((c[1] as RequestInit).headers).toMatchObject({ Accept: "application/vnd.github+json" });
  });
  it("skips forks and takes the next repo", async () => {
    const f = routes({ repos: () => json([repo({ name: "some-fork", fork: true }), repo({ name: "geotrack", html_url: "https://github.com/emindundar/geotrack" })]) });
    expect((await fetchNowStats("emindundar", f, NOW))?.repo.name).toBe("geotrack");
  });
  it("keeps the repo when only the commit search fails", async () => {
    for (const search of [() => json({ message: "rate limit" }, 403), () => json({ total_count: "many" }), async () => { throw new Error("down"); }]) {
      const r = await fetchNowStats("emindundar", routes({ search }), NOW);
      expect(r).toMatchObject({ repo: { name: "portfolio" }, commits30d: null });
    }
  });
  it.each([
    ["403 rate limit", () => json({ message: "API rate limit exceeded" }, 403)],
    ["500", () => json({}, 500)],
    ["network error", async () => { throw new Error("ENOTFOUND"); }],
    ["not an array", () => json({ message: "Not Found" })],
    ["empty list", () => json([])],
    ["only forks", () => json([repo({ fork: true })])],
    ["bad date", () => json([repo({ pushed_at: "yesterday" })])],
    ["url off github.com", () => json([repo({ html_url: "javascript:alert(1)" })])],
    ["html body", () => new Response("<html>")],
  ])("is null when repos answer: %s", async (_n, repos) => {
    expect(await fetchNowStats("emindundar", routes({ repos }), NOW)).toBeNull();
  });
});
```

Run: `pnpm vitest run lib/github.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement `lib/github.ts`**

```ts
export type NowStats = { repo: { name: string; url: string }; pushedAt: string; commits30d: number | null };

const API = "https://api.github.com";
const HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const DAY = 24 * 60 * 60 * 1000;

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return res.json();
}

type RawRepo = { name: unknown; html_url: unknown; pushed_at: unknown; fork: unknown };

async function commitCount(user: string, since: string, fetchImpl: typeof fetch): Promise<number | null> {
  try {
    const q = new URLSearchParams({ q: `author:${user} author-date:>=${since}`, per_page: "1" });
    const body = (await getJson(`${API}/search/commits?${q}`, fetchImpl)) as { total_count?: unknown };
    return typeof body.total_count === "number" && Number.isInteger(body.total_count) && body.total_count >= 0 ? body.total_count : null;
  } catch {
    return null;
  }
}

/** Unauthenticated, two requests. Any problem with the repo list → null (the caller renders nothing live). */
export async function fetchNowStats(user: string, fetchImpl: typeof fetch, now: Date): Promise<NowStats | null> {
  try {
    const list = await getJson(`${API}/users/${user}/repos?sort=pushed&direction=desc&per_page=10&type=owner`, fetchImpl);
    if (!Array.isArray(list)) return null;
    const first = (list as RawRepo[]).find((r) => r && r.fork === false);
    if (!first || typeof first.name !== "string" || typeof first.html_url !== "string" || typeof first.pushed_at !== "string") return null;
    if (!first.html_url.startsWith("https://github.com/")) return null;
    const pushed = new Date(first.pushed_at);
    if (Number.isNaN(pushed.getTime())) return null;
    const since = new Date(now.getTime() - 30 * DAY).toISOString().slice(0, 10);
    return {
      repo: { name: first.name, url: first.html_url },
      pushedAt: pushed.toISOString().slice(0, 10),
      commits30d: await commitCount(user, since, fetchImpl),
    };
  } catch {
    return null;
  }
}
```

Run: `pnpm vitest run lib/github.test.ts` — Expected: PASS. (`URLSearchParams` encodes the space as `+` and `:`/`>`/`=` as `%3A`/`%3E`/`%3D`, matching the test URL.)

- [ ] **Step 3: Cached wrapper**

Add `export const GITHUB_USER = "emindundar";` to `lib/site.ts` and derive `GITHUB_URL` from it (`` `https://github.com/${GITHUB_USER}` ``).

Create `lib/now.ts`:

```ts
import { cacheLife } from "next/cache";
import { GITHUB_USER } from "@/lib/site";
import { fetchNowStats, type NowStats } from "@/lib/github";

/** Cached for an hour (spec §2.6). Failures are cached as null for the same hour: the page never waits on GitHub twice. */
export async function getNowStats(): Promise<NowStats | null> {
  "use cache";
  cacheLife("hours");
  return fetchNowStats(GITHUB_USER, fetch, new Date());
}
```

Verify against the installed Next version before relying on it: open `node_modules/next/dist/docs/` (search for `cacheLife` and `use cache`) and confirm (a) the import path of `cacheLife`, (b) that the built-in `"hours"` profile revalidates every hour, (c) that `new Date()` and `fetch` are permitted inside a `"use cache"` function under `cacheComponents`. If `new Date()` is rejected at build, state the exact error in the report and stop with BLOCKED rather than moving the clock out of the cache scope.

- [ ] **Step 4: Manual status content**

`content/now.json`:

```json
{
  "updated": "2026-10-08",
  "en": { "text": "Building this site in the open: case studies, a contact form and a live GitHub signal." },
  "tr": { "text": "Bu siteyi açık kaynak olarak geliştiriyorum: vaka çalışmaları, iletişim formu ve canlı GitHub sinyali." }
}
```

Append to `content/schema-site.ts` (it already defines `FULL_DATE`):

```ts
export const nowSchema = s.object({
  updated: s.string().regex(FULL_DATE),
  en: s.object({ text: s.string().min(10).max(160) }),
  tr: s.object({ text: s.string().min(10).max(160) }),
});
```

`velite.config.ts`: import `nowSchema`, add

```ts
const now = defineCollection({ name: "Now", pattern: "now.json", schema: nowSchema, single: true });
```

and include `now` in `collections`. (`single: true` is valid here because the file is one object; the earlier failure was with array files.)

`lib/content/site.ts`: import `now` from `#site/content` and add

```ts
export const getNow = (locale: Locale) => ({ updated: now.updated, text: now[locale].text });
```

Add a schema test next to the existing site-schema tests (find them with `grep -rl "timelineSchema" --include=*.test.ts .`), in the same style:

```ts
describe("nowSchema", () => {
  const ok = { updated: "2026-10-08", en: { text: "Building something useful." }, tr: { text: "Faydalı bir şey geliştiriyorum." } };
  it("accepts a dated bilingual line", () => expect(nowSchema.safeParse(ok).success).toBe(true));
  it("rejects a missing translation, a bad date and an over-long line", () => {
    expect(nowSchema.safeParse({ ...ok, tr: undefined }).success).toBe(false);
    expect(nowSchema.safeParse({ ...ok, updated: "October" }).success).toBe(false);
    expect(nowSchema.safeParse({ ...ok, en: { text: "x".repeat(161) } }).success).toBe(false);
  });
});
```

- [ ] **Step 5: Messages**

`messages/en.json`:

```json
"Now": {
  "heading": "Now",
  "updated": "Updated {date}",
  "lastPush": "Last push",
  "commits": "{count, plural, =0 {No public commits} one {# public commit} other {# public commits}} in the last 30 days",
  "source": "Live from GitHub"
}
```

`messages/tr.json`:

```json
"Now": {
  "heading": "Şu an",
  "updated": "Güncelleme: {date}",
  "lastPush": "Son push",
  "commits": "Son 30 günde {count, plural, =0 {herkese açık commit yok} other {# herkese açık commit}}",
  "source": "GitHub'dan canlı"
}
```

- [ ] **Step 6: Failing component test**

Create `components/home/NowPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { NowStats } from "@/lib/github";

const stats = vi.hoisted(() => ({ value: null as NowStats | null }));
vi.mock("@/lib/now", () => ({ getNowStats: async () => stats.value }));
vi.mock("@/lib/content/site", () => ({ getNow: () => ({ updated: "2026-10-08", text: "Building this site in the open." }) }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const en = (await import("@/messages/en.json")).default;
  return { getTranslations: async (ns: string) => createTranslator({ locale: "en", messages: en, namespace: ns as "Now" }) };
});

import { NowPanel } from "./NowPanel";

const show = async (value: NowStats | null) => {
  stats.value = value;
  return render(await NowPanel({ locale: "en" }));
};

describe("NowPanel", () => {
  it("always shows the manual line with its date", async () => {
    const { container } = await show(null);
    expect(screen.getByRole("heading", { level: 2, name: "Now" })).toBeInTheDocument();
    expect(screen.getByText("Building this site in the open.")).toBeInTheDocument();
    expect(container.querySelector('time[datetime="2026-10-08"]')).toHaveTextContent("8 Oct 2026");
    expect(container.querySelector("[data-now-live]")).toBeNull();
  });
  it("adds the live row when GitHub answered", async () => {
    const { container } = await show({ repo: { name: "portfolio", url: "https://github.com/emindundar/portfolio" }, pushedAt: "2026-10-07", commits30d: 42 });
    const live = container.querySelector("[data-now-live]")!;
    expect(live.querySelector("a")).toHaveAttribute("href", "https://github.com/emindundar/portfolio");
    expect(live.querySelector('time[datetime="2026-10-07"]')).toHaveTextContent("7 Oct 2026");
    expect(live).toHaveTextContent("42 public commits in the last 30 days");
  });
  it("omits the commit count when it is unknown and pluralizes one", async () => {
    const base = { repo: { name: "portfolio", url: "https://github.com/emindundar/portfolio" }, pushedAt: "2026-10-07" };
    const a = await show({ ...base, commits30d: null });
    expect(a.container.querySelector("[data-now-live]")).not.toHaveTextContent("commit");
    a.unmount();
    const b = await show({ ...base, commits30d: 1 });
    expect(b.container.querySelector("[data-now-live]")).toHaveTextContent("1 public commit in the last 30 days");
  });
});
```

Run: `pnpm vitest run components/home/NowPanel.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 7: Implement the panel and mount it**

Create `components/home/NowPanel.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getNow } from "@/lib/content/site";
import { formatDate } from "@/lib/format";
import { getNowStats } from "@/lib/now";

export async function NowPanel({ locale }: { locale: Locale }) {
  const t = await getTranslations("Now");
  const tc = await getTranslations("Case");
  const now = getNow(locale);
  const stats = await getNowStats();
  return (
    <section aria-labelledby="now-heading" data-now className="border-y border-line px-4 py-6 md:px-6">
      <div className="grid gap-4 font-mono text-sm md:grid-cols-12">
        <h2 id="now-heading" className="flex items-center gap-2 uppercase text-muted md:col-span-2">
          <span className="inline-block h-2 w-2 bg-accent" aria-hidden="true" />
          {t("heading")}
        </h2>
        <div className="md:col-span-6">
          <p className="font-sans text-base text-fg">{now.text}</p>
          <p className="mt-1 text-xs text-muted">
            {t.rich("updated", { date: () => <time dateTime={now.updated}>{formatDate(now.updated, locale)}</time> })}
          </p>
        </div>
        {stats && (
          <div data-now-live className="md:col-span-4">
            <p>
              <span className="text-muted">{t("lastPush")}: </span>
              <a href={stats.repo.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0">
                {stats.repo.name}
                <span className="sr-only"> ({tc("newTab")})</span>
              </a>
              <span className="text-muted"> · </span>
              <time dateTime={stats.pushedAt}>{formatDate(stats.pushedAt, locale)}</time>
            </p>
            {stats.commits30d !== null && <p className="text-muted">{t("commits", { count: stats.commits30d })}</p>}
            <p className="mt-1 text-xs text-muted">{t("source")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
```

For `t.rich` the message placeholder must be a tag: change `"updated"` to `"Updated <date></date>"` / `"Güncelleme: <date></date>"` in both message files (and update Step 5's JSON accordingly) — or, simpler and equally correct, drop `t.rich` and render `{t("updated")} <time …>` with messages `"Updated"` / `"Güncelleme:"`. Pick the simpler form; keep the test's `time[datetime]` assertions.

`app/[locale]/page.tsx`: import `NowPanel`, add `setRequestLocale(locale)` after the locale check (import it from `next-intl/server`), and render `<NowPanel locale={locale} />` between `<Hero />` and `<Capabilities … />`.

Run: `pnpm vitest run components/home/NowPanel.test.tsx` — Expected: PASS.

- [ ] **Step 8: e2e**

Create `e2e/now.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

for (const [locale, heading] of [["en", "Now"], ["tr", "Şu an"]] as const) {
  test(`${locale}: now panel shows the manual line and a dated update`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const panel = page.locator("[data-now]");
    await expect(panel.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    await expect(panel.locator("p").first()).not.toBeEmpty();
    await expect(panel.locator("time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  });
}

test("live row, when GitHub answered at build time, links to a github.com repo with a date", async ({ page }) => {
  await page.goto("/en");
  const live = page.locator("[data-now-live]");
  // Built without network (or rate-limited): the row is absent by design; unit tests cover both branches.
  test.skip((await live.count()) === 0, "GitHub was unreachable when this build ran");
  await expect(live.getByRole("link")).toHaveAttribute("href", /^https:\/\/github\.com\/emindundar\//);
  await expect(live.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
});

test("the panel does not push the hero headline out of the first mobile viewport", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile layout check");
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});
```

- [ ] **Step 9: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm lhci`
Expected: all clean. Check in the build table that `/[locale]` is still fully static (not `◐`). Check `curl -s localhost:3100/en | grep -c data-now-live` after `pnpm exec next start -p 3100` and report whether the live row was built. Report `/en` CLS, performance and LCP element (must still be the `h1`).

Offline check: `pnpm build` with the network blocked for GitHub (`HTTPS_PROXY=http://127.0.0.1:9 pnpm build`, or temporarily point `API` at an unroutable host and revert) must succeed and render the panel without `[data-now-live]`. Report the result.

- [ ] **Step 10: Commit**

```bash
git add lib/github.ts lib/github.test.ts lib/now.ts lib/site.ts lib/content/site.ts content/now.json content/schema-site.ts velite.config.ts components/home/NowPanel.tsx components/home/NowPanel.test.tsx app/[locale]/page.tsx messages e2e/now.spec.ts
git add -u
git commit -m "feat(home): now panel with manual status and cached GitHub signal"
```

---

### Task 4: Analytics, housekeeping and docs

**Files:**
- Create: `components/layout/Analytics.tsx`, `components/layout/Analytics.test.tsx`
- Modify: `app/[locale]/layout.tsx`, `messages/en.json`, `messages/tr.json`, every file using `Case.newTab` outside case pages, `README.md`, `CLAUDE.md`, `app/[locale]/colophon/page.tsx` messages if they list the stack (add Resend / Turnstile / Umami only if the Colophon stack list already names services)

**Interfaces:**
- Consumes: nothing new.
- Produces: `<Analytics />` (server component, renders nothing without `NEXT_PUBLIC_UMAMI_ID`); message key `Common.newTab` replacing `Case.newTab`.

- [ ] **Step 1: Failing test**

Create `components/layout/Analytics.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/script", () => ({ default: (p: Record<string, unknown>) => <script data-testid="umami" {...p} /> }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(id?: string) {
  if (id !== undefined) vi.stubEnv("NEXT_PUBLIC_UMAMI_ID", id);
  const { Analytics } = await import("./Analytics");
  return render(<Analytics />);
}

describe("Analytics", () => {
  it("renders nothing without a site id", async () => {
    expect((await load("")).container).toBeEmptyDOMElement();
  });
  it("loads the Umami script deferred, with the id and Do Not Track respected", async () => {
    const s = (await load("abc-123")).getByTestId("umami");
    expect(s).toHaveAttribute("src", "https://cloud.umami.is/script.js");
    expect(s).toHaveAttribute("data-website-id", "abc-123");
    expect(s).toHaveAttribute("data-do-not-track", "true");
    expect(s).toHaveAttribute("strategy", "afterInteractive");
  });
  it("ignores an id that is not a plain token", async () => {
    expect((await load('"><script>')).container).toBeEmptyDOMElement();
  });
});
```

Run: `pnpm vitest run components/layout/Analytics.test.tsx` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement and mount**

Create `components/layout/Analytics.tsx`:

```tsx
import Script from "next/script";

// Build-time constant (cacheComponents: no per-request env read in render).
const ID = process.env.NEXT_PUBLIC_UMAMI_ID ?? "";

/** Cookieless Umami Cloud analytics. Renders nothing unless a site id is configured. */
export function Analytics() {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(ID)) return null;
  return <Script src="https://cloud.umami.is/script.js" data-website-id={ID} data-do-not-track="true" strategy="afterInteractive" />;
}
```

The "ignores a bad id" test stubs a short/invalid value; the `{8,64}` floor means the happy-path test id must be at least 8 characters — `abc-123` is 7: use `abc-1234` in the test.

`app/[locale]/layout.tsx`: import `Analytics` and render `<Analytics />` as the last child of `<body>`, after `</NextIntlClientProvider>`.

Run: `pnpm vitest run components/layout/Analytics.test.tsx` — Expected: PASS.

- [ ] **Step 3: Move `newTab` to a shared namespace**

Add `"Common": { "newTab": "<current Case.newTab value>" }` to both message files, remove `Case.newTab`, and update every `t("newTab")` call site (find with `grep -rn "newTab" app components`) to read from `Common`. `lib/messages.test.ts` must stay green.

- [ ] **Step 4: Docs**

`README.md` — add a "Configuration" section:

```markdown
## Configuration

All variables are optional. Copy `.env.example` to `.env.local`.

| Variable | Used by | Without it |
|---|---|---|
| `RESEND_API_KEY`, `CONTACT_TO` | contact form mail | form answers "not available", points to LinkedIn |
| `CONTACT_FROM` | sender address | `Portfolio <onboarding@resend.dev>` |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | bot check | form answers "not available" |
| `CONTACT_DRY_RUN=1` | local work and e2e | — (never set in production) |
| `NEXT_PUBLIC_UMAMI_ID` | analytics | no analytics script |

The home page "now" panel reads `content/now.json` (edit the text and the `updated` date by hand) and, once an hour, two unauthenticated GitHub API endpoints. If GitHub does not answer, only the hand-written line is shown.
```

Also add `/contact` to the README "Pages" list.

`CLAUDE.md` "Learned constraints" — append:

```markdown
- Contact: all logic in `lib/contact.ts` (pure, injected deps); `app/[locale]/contact/actions.ts` only wires env/headers. Order: honeypot → zod → configured? → rate limit (5/h/IP, in-memory) → Turnstile → Resend (REST via fetch, no SDK). Validation runs before Turnstile because tokens are single-use. Fails closed (`unavailable`) when secrets are missing; `CONTACT_DRY_RUN=1` (set by Playwright's webServer) skips verify + send only.
- Contact e2e: each test sends its own `x-forwarded-for` so the shared in-memory limiter never collides; hooks `form[data-contact-form]`, `[data-contact-status]`.
- Now panel: `lib/now.ts` is the only `"use cache"` function (`cacheLife("hours")`); `lib/github.ts` returns null on any failure and the panel then shows only `content/now.json`. Hooks `[data-now]`, `[data-now-live]` (may be absent — builds without GitHub access are valid).
- Analytics: `components/layout/Analytics.tsx` renders the Umami script only when `NEXT_PUBLIC_UMAMI_ID` is set; CI and LHCI run without it.
- `NEXT_PUBLIC_*` and other build-time env is read at module scope, never inside a page/layout render.
```

Update the "LHCI URLs" line to include `/en/contact` with its measured numbers, and remove the stale "Known: /work CLS 0.13" clause if it is still present.

- [ ] **Step 5: Verify everything**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm lhci`
Expected: all clean (LCP warnings allowed). Then with analytics on: `NEXT_PUBLIC_UMAMI_ID=00000000-0000-0000-0000-000000000000 pnpm build && pnpm lhci` — the script-size and performance gates must still pass; report the `/en` script transfer delta. Rebuild without the variable afterwards.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(analytics): optional Umami script; shared newTab label; contact and now-panel docs"
```

---

## Owner steps (outside the code, any time before announcing the site)

Until steps 1-4 are done the form shows "not available" and points to LinkedIn; nothing breaks.

1. **Resend:** create the account **with the mailbox that should receive the messages**, then create an API key. Vercel → project `eminsportfolio` → Settings → Environment Variables, environment **Production only**: `RESEND_API_KEY` and `CONTACT_TO`. While `CONTACT_FROM` is unset (the shared sender `onboarding@resend.dev`), `CONTACT_TO` **must be the e-mail address of the Resend account itself**: Resend rejects any other recipient with 403 and the visitor sees "could not be sent".
2. **Turnstile:** Cloudflare dashboard → Turnstile → add widget, mode "Managed", hostname `eminsportfolio.vercel.app` (add `emindundar.dev` later; never the bare `vercel.app`). Vercel, **Production only**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Both are needed: with the secret but no site key the form answers "not available".
3. **Preview deployments:** set only `CONTACT_DRY_RUN=1`, environment **Preview only**. Preview URLs are other hostnames (`eminsportfolio-git-<branch>-….vercel.app`), so the real widget would fail there; with the dry run the form validates, answers success and sends nothing. Do not put the Resend or Turnstile keys in Preview. The dry run is ignored in Production even if the variable ends up there.
4. **Redeploy.** `NEXT_PUBLIC_*` values are baked in at build time: after adding or changing one, trigger a **new deployment** (Deployments → ⋯ → Redeploy). A running deployment does not pick them up.
5. **Umami Cloud (optional):** add the website, copy the website id into `NEXT_PUBLIC_UMAMI_ID`, **Production only** (otherwise previews pollute the statistics). Optionally `NEXT_PUBLIC_UMAMI_DOMAINS=eminsportfolio.vercel.app` (comma-separated hostnames) so no other host can report. Redeploy as in step 4.
6. **Smoke test on the production URL:** send one message through the form, confirm it arrives, and confirm that "Reply" addresses the visitor, not the sender. No automated test exercises the real Turnstile + Resend path. If it fails: Vercel → project → Logs, search `contact:`. The line names the cause: `not configured (missing <VARIABLE>)`, `turnstile rejected (<Cloudflare error code or HTTP status>)`, `mail provider rejected the message (401)` = wrong API key, `(403)` = recipient not allowed (see step 1), `(429)` = quota, `global send ceiling reached` = more than 30 messages in an hour.
7. After the domain is bought: verify it in Resend, set `CONTACT_FROM=Portfolio <contact@emindundar.dev>` (then `CONTACT_TO` may be any mailbox), add `emindundar.dev` to the Turnstile widget and to `NEXT_PUBLIC_UMAMI_DOMAINS`, redeploy, repeat step 6.

## Self-review notes

- Spec §2.1 contact page → Task 2. §4.4 form order → Task 1 (with the documented validation-before-Turnstile reorder). §2.6 / §4.4 GitHub panel → Task 3 (deviations 1–2 listed above). §4.6 analytics → Task 4. §4.9 error handling (log + i18n generic message) → Tasks 1–2. §4.10 tests: `lib/contact.ts` unit (zod, honeypot, rate limit), `lib/github.ts` unit (transformer, failure path), e2e "honeypot filled → no send" → Tasks 1–3. §4.11 secrets → `.env.example`, README, owner steps.
- Not in this phase: OG images, JSON-LD, sitemap, `global-not-found`, LCP work, domain (Faz 1.5); terminal mode, blog (Faz 2); AI assistant (Faz 3).
- Review Focus mapping: 1 → Task 2 Step 4 pending test; 2 → Task 1 `buildEmail` + newline-in-name tests; 3 → Task 2 unit + e2e "invalid e-mail"; 4 → Task 2 `onUnavailable` path (add a unit test in `ContactForm.test.tsx` that renders with a non-empty `siteKey`, mocks `./Turnstile` to call `onUnavailable` on mount, and expects the alert with the LinkedIn link) + no-JS e2e; 5 → Task 3 Step 1 table.
