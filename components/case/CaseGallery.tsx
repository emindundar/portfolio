import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Project } from "@/lib/content";
import { imageFor } from "@/lib/media";

/** Extra stills below the body. Images keep their intrinsic width (never upscaled), centered in a bordered box. */
export async function CaseGallery({ items, locale }: { items: NonNullable<Project["gallery"]>; locale: Locale }) {
  const t = await getTranslations("Case");
  const images = items.flatMap((item) => {
    const img = imageFor(item.src);
    return img ? [{ base: item.src, alt: item.alt[locale], ...img }] : [];
  });
  if (images.length === 0) return null;
  return (
    <section data-case-gallery aria-label={t("gallery")} className="mt-16 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
      {images.map((img) => (
        <figure key={img.base} className="m-0 flex items-center justify-center border border-line bg-surface p-4 md:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated responsive set */}
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes="(min-width: 640px) 50vw, 100vw"
            alt={img.alt}
            width={img.width}
            height={img.height}
            loading="lazy"
            decoding="async"
            className="block h-auto max-h-[70svh] w-auto max-w-full"
          />
        </figure>
      ))}
    </section>
  );
}
