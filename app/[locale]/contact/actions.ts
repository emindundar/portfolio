"use server";

import { headers } from "next/headers";
import { CLIENT_LIMIT, GLOBAL_LIMIT, contactDepsFrom, createRateLimiter, submitContact, type ContactShared, type ContactState } from "@/lib/contact";

// Module scope: one set of limiters per server instance (spec §4.4: in-memory, per instance, paired with Turnstile).
const shared: ContactShared = {
  limiter: createRateLimiter(CLIENT_LIMIT.max, CLIENT_LIMIT.windowMs),
  fuse: createRateLimiter(GLOBAL_LIMIT.max, GLOBAL_LIMIT.windowMs),
  now: Date.now,
  fetch: (...args) => fetch(...args),
  log: (m) => console.error(m),
};

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const h = await headers();
  // All decisions (client address, dry run, what counts as configured) live in lib/contact.ts, where they are tested.
  // The site key is read as a literal so the server sees the value this build inlined into the client bundle:
  // a key added without a new deployment is still "missing" here, exactly as it is for the widget.
  const env = { ...process.env, NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY };
  return submitContact(form, contactDepsFrom(env, (name) => h.get(name), shared));
}
