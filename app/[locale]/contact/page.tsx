import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { BUDGETS, HONEYPOT_FIELD } from "@/lib/contact";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/site";
import { ContactForm } from "@/components/contact/ContactForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/contact", locale) };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Build-time constant: reading it at module scope keeps the page static.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Contact" });
  const tc = await getTranslations({ locale, namespace: "Common" });
  const links = [
    { href: LINKEDIN_URL, label: "LinkedIn" },
    { href: GITHUB_URL, label: "GitHub" },
  ];
  return (
    <main className="px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("intro")}</p>
      <div className="mt-12 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-8">
          <ContactForm locale={locale} siteKey={SITE_KEY} linkedinUrl={LINKEDIN_URL} budgets={BUDGETS} honeypotField={HONEYPOT_FIELD} />
        </div>
        <aside className="md:col-span-4">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-muted">{t("elsewhere")}</h2>
          <ul className="grid gap-1 font-mono text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  {/* One flex item, with the space in normal flow: leading whitespace inside the sr-only box can be collapsed out of the name. */}
                  <span>
                    {l.label}
                    <span aria-hidden="true">&nbsp;↗</span>{" "}
                    <span className="sr-only">({tc("newTab")})</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
