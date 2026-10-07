import { getTranslations } from "next-intl/server";

// Computed once at module load: a build-time constant is correct for a statically built site.
const YEAR = new Date().getFullYear();

export async function Footer() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-line px-6 py-6 font-mono text-sm text-muted">
      © {YEAR} {t("rights")}
    </footer>
  );
}
