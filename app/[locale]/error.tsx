"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Error boundaries must be client components. Mirrors not-found.tsx; never shows error details.
export default function LocaleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Error");
  const nf = useTranslations("NotFound");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="p-6">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("body")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center border border-accent bg-accent px-4 font-mono text-bg transition-colors duration-200 hover:bg-transparent hover:text-accent"
        >
          {t("retry")}
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center border border-line px-4 font-mono">
          {nf("backHome")}
        </Link>
      </div>
    </main>
  );
}
