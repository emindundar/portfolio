import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

// Relative Location, no request access: keeps the route fully static.
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  return new Response(null, { status: 302, headers: { Location: `/cv/Emin_Dundar_CV_${l}.pdf` } });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
