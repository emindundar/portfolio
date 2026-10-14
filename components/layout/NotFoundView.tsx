import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/** The localized 404 body, inside SiteFrame: app/[locale]/not-found.tsx and the localized global 404. */
export function NotFoundView() {
  const t = useTranslations("NotFound");
  return (
    <main className="flex min-h-[60svh] flex-col justify-center px-4 py-16 md:px-6">
      <p className="font-mono text-sm uppercase tracking-wide text-muted">404</p>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("body")}</p>
      <div className="mt-8">
        <Button href="/" variant="ghost">
          {t("backHome")} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </main>
  );
}
