import { imageFor } from "@/lib/media";

/** Text-first hero. The portrait appears automatically once `/media/about/portrait` exists in the media manifest. */
export function AboutHero({ title, intro, portraitAlt }: { title: string; intro: string; portraitAlt: string }) {
  const portrait = imageFor("/media/about/portrait");
  return (
    <header className="grid gap-8 px-4 py-12 md:grid-cols-12 md:gap-6 md:px-6 md:py-16">
      <div className={portrait ? "md:col-span-8" : "md:col-span-10"}>
        <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
      </div>
      {portrait && (
        <div className="md:col-span-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated responsive set */}
          <img
            src={portrait.src}
            srcSet={portrait.srcSet}
            sizes="(min-width: 768px) 30vw, 100vw"
            alt={portraitAlt}
            width={portrait.width}
            height={portrait.height}
            decoding="async"
            className="block h-auto w-full border border-line"
          />
        </div>
      )}
    </header>
  );
}
