"use server";

import { headers } from "next/headers";
import {
  UNKNOWN_IP, createRateLimiter, createResendSender, createTurnstileVerifier, submitContact, type ContactState,
} from "@/lib/contact";

// Module scope: one limiter per server instance (spec §4.4: in-memory, per instance, paired with Turnstile).
const limiter = createRateLimiter(5, 60 * 60 * 1000);

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const h = await headers();
  // Vercel sets x-forwarded-for; the first entry is the client.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || UNKNOWN_IP;
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
    // Dry run is for local/preview demos only: it skips the bot check and mail, so it must never be
    // honoured in production even if the variable leaks into that environment.
    dryRun: CONTACT_DRY_RUN === "1" && process.env.VERCEL_ENV !== "production",
    log: (m) => console.error(m),
  });
}
