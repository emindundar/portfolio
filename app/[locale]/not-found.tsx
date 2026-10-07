import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="p-6">
      <p className="font-mono text-muted">404</p>
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("body")}</p>
      <Link href="/" className="mt-6 inline-block border border-line px-4 py-2 font-mono">
        {t("backHome")}
      </Link>
    </main>
  );
}
