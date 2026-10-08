import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  return Response.redirect(new URL(`/cv/Emin_Dundar_CV_${l}.pdf`, request.url), 302);
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
