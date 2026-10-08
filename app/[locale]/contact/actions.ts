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
