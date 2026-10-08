import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const STACK = [
  "Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "next-intl", "Velite", "GSAP",
  "Lenis", "OGL", "Vitest", "Playwright", "Lighthouse CI", "Vercel",
];
const PARAGRAPHS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;
const PROCESS = ["process1", "process2", "process3", "process4"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Colophon" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/colophon", locale) };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ColophonPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Colophon" });
  const tc = await getTranslations({ locale, namespace: "Case" });
  return (
    <main className="px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <div className="mt-8 flex max-w-[68ch] flex-col gap-4 leading-relaxed">
        {PARAGRAPHS.map((k) => (
          <p key={k}>{t(k)}</p>
        ))}
      </div>
      <div className="mt-12 grid gap-10 border-t border-line pt-6 md:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl">{t("stackHeading")}</h2>
          <ul className="mt-4 list-none p-0 font-mono text-sm">
            {STACK.map((s) => (
              <li key={s} className="border-b border-line py-2">{s}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl">{t("processHeading")}</h2>
          <ol className="mt-4 list-none p-0 font-mono text-sm">
            {PROCESS.map((k, i) => (
              <li key={k} className="flex gap-3 border-b border-line py-2">
                <span className="text-muted">{String(i + 1).padStart(2, "0")}</span>
                {t(k)}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <p className="mt-10">
        <a
          href="https://github.com/emindundar/portfolio"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center font-mono text-sm text-accent underline underline-offset-4"
        >
          {t("repo")}
          <span className="sr-only"> ({tc("newTab")})</span>
        </a>
      </p>
    </main>
  );
}
