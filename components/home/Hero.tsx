import { getTranslations } from "next-intl/server";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { HeroShaderLoader } from "@/components/canvas/HeroShaderLoader";
import { Button } from "@/components/ui/Button";

export async function Hero() {
  const t = await getTranslations("Hero");
  return (
    <section className="relative isolate flex min-h-[88svh] flex-col justify-end px-4 pb-12 md:px-6">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <HeroShaderLoader />
      </div>
      <p className="mb-6 font-mono text-sm uppercase tracking-wide text-muted">{t("eyebrow")}</p>
      <SplitReveal as="h1" className="max-w-[14ch] font-display text-[clamp(3rem,12vw,11rem)] leading-[0.95] tracking-tight">
        {t("headline")}
      </SplitReveal>
      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="max-w-xl text-lg text-muted">{t("sub")}</p>
        <Magnetic>
          <Button href="/work">{t("cta")} →</Button>
        </Magnetic>
      </div>
      <span aria-hidden="true" className="absolute bottom-4 right-4 font-mono text-xs uppercase text-muted">{t("scroll")}</span>
    </section>
  );
}
