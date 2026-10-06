import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("Home");
  return (
    <main className="p-6">
      <p className="font-mono text-muted uppercase tracking-wide">{t("eyebrow")}</p>
      <h1 className="font-display text-6xl">{t("headline")}</h1>
    </main>
  );
}
