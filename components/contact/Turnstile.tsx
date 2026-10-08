"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
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
      s.remove();
      reject(new Error("turnstile script failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

type Props = { siteKey: string; locale: string; onUnavailable: () => void };

/**
 * Renders the widget inside the surrounding <form>; Cloudflare adds the hidden `cf-turnstile-response` input itself.
 * A token is single-use: the parent remounts this component after every server answer to get a fresh one.
 */
export function Turnstile({ siteKey, locale, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let id: string | null = null;
    loadScript()
      .then(() => {
        if (cancelled || !host.current || !window.turnstile) return;
        const theme = document.documentElement.dataset.theme;
        id = window.turnstile.render(host.current, {
          sitekey: siteKey,
          language: locale,
          // No data-theme = the visitor follows the system preference; so does the widget.
          theme: theme === "light" || theme === "dark" ? theme : "auto",
          appearance: "interaction-only",
          size: "flexible",
          // The widget is 0px tall unless Cloudflare needs the visitor to act; only then does it get spacing.
          "before-interactive-callback": () => host.current?.setAttribute("data-interactive", ""),
          "after-interactive-callback": () => host.current?.removeAttribute("data-interactive"),
          "error-callback": () => {
            onUnavailable();
            return true; // handled: keeps Cloudflare from logging the same failure to the console
          },
        });
      })
      .catch(() => {
        if (!cancelled) onUnavailable();
      });
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, locale, onUnavailable]);

  return <div ref={host} data-turnstile className="data-[interactive]:mb-6" />;
}
