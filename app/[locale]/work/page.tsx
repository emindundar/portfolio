import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { parseFacet, filterProjects } from "@/lib/content/filter";
import { WorkFilter } from "@/components/work/WorkFilter";
import { WorkList } from "@/components/work/WorkList";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ f?: string | string[] }>;
};

// Canonical/hreflang deliberately ignore `?f`: every filter view is the same document for search engines.
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Work" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/work", locale) };
}

// The filtered list is streamed into a hidden `<div hidden id="S:…">` at the end of <body> and moved into place by
// React's inline script. Without JavaScript nothing moves it, so reveal it where it lands (above the footer) and
// drop the placeholder. Tailwind's preflight hides `[hidden]` with `!important` inside `@layer base`; an important
// declaration only loses to an important one in an EARLIER layer, hence `@layer theme`.
// Depends on React's streaming markup; e2e/work.spec.ts ("no JS") guards it.
const STREAMED = 'body>div[hidden][id^="S:"]';
const NO_SCRIPT_CSS =
  `@layer theme{${STREAMED}{display:block!important}}` +
  `[data-work-pending]{display:none}` +
  `${STREAMED}{order:1;padding:0 1rem 3rem}` +
  `body>footer{order:2}` +
  `@media (min-width:48rem){${STREAMED}{padding:0 1.5rem 4rem}}`;

// The only part that reads searchParams: dynamic hole inside the static shell (cacheComponents).
async function List({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { f } = await searchParams;
  const facet = parseFacet(f);
  const all = getProjects(locale);
  return (
    <>
      <WorkFilter active={facet} projects={all} />
      <WorkList items={filterProjects(all, facet)} facet={facet} />
    </>
  );
}

export default async function WorkPage(props: Props) {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Work" });
  return (
    <main className="px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("description")}</p>
      <Suspense
        fallback={
          <div data-work-pending className="mt-12 min-h-dvh border-t border-line pt-6 font-mono text-muted">
            <p role="status" className="sr-only">
              {t("loading")}
            </p>
            <span aria-hidden="true">…</span>
          </div>
        }
      >
        <List {...props} />
      </Suspense>
      {/* No-JS only. Relies on React's streaming container markup (`<div hidden id="S:n">` appended to <body>),
          see NO_SCRIPT_CSS above; guarded by e2e/work.spec.ts "URL filter narrows the list server-side (no JS needed)". */}
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
    </main>
  );
}
