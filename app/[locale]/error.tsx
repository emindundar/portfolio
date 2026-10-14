"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClasses } from "@/components/ui/Button";

// Error boundaries must be client components. Mirrors not-found.tsx; never shows error details.
export default function LocaleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("Error");
  const nf = useTranslations("NotFound");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60svh] flex-col justify-center px-4 py-16 md:px-6">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("body")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className={buttonClasses("primary")}>
          {t("retry")}
        </button>
        <Button href="/" variant="ghost">
          {nf("backHome")} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </main>
  );
}
