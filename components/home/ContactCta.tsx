import { getTranslations } from "next-intl/server";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Button } from "@/components/ui/Button";

export async function ContactCta() {
  const t = await getTranslations("Cta");
  return (
    <section className="border-t border-line px-4 py-24 md:px-6">
      <SectionReveal>
        <p data-reveal className="mb-4 flex items-center gap-2 font-mono text-sm uppercase text-muted">
          <span className="inline-block h-2 w-2 bg-accent" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h2 data-reveal className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("heading")}</h2>
        <div data-reveal className="mt-10">
          <Button href="/contact">{t("button")} →</Button>
        </div>
      </SectionReveal>
    </section>
  );
}
