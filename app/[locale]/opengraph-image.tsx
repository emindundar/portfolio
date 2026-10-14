import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ogFonts } from "@/lib/og/fonts";
import { OG_SIZE, OgTemplate } from "@/lib/og/template";
import { SITE_URL } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Emin Dündar";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Hero" });
  return new ImageResponse(<OgTemplate eyebrow={t("eyebrow")} title={t("headline")} footer={new URL(SITE_URL).host} locale={locale} />, { ...size, fonts: await ogFonts() });
}
