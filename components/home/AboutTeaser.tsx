import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Button } from "@/components/ui/Button";

export async function AboutTeaser() {
  const t = await getTranslations("AboutTeaser");
  return (
    <section className="px-4 py-16 md:px-6">
      <SectionHeader number="03" title={t("heading")} />
      <SectionReveal className="grid gap-8 md:grid-cols-12">
        <p data-reveal className="text-lg leading-relaxed md:col-span-8">{t("body")}</p>
        <div data-reveal className="md:col-span-4 md:justify-self-end">
          <Button href="/about" variant="ghost">{t("more")} <span aria-hidden="true">→</span></Button>
        </div>
      </SectionReveal>
    </section>
  );
}
