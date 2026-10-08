import type { Project } from "@/lib/content";
import { imageFor, videoFor, sizesFor } from "@/lib/media";
import { DeviceFrame } from "@/components/ui/DeviceFrame";
import { TypoCover } from "@/components/ui/TypoCover";
import { VideoCover } from "./VideoCover";

export function MediaCover({
  project,
  kind,
  facetLabels,
  priority = false,
}: {
  project: Project;
  kind: "list" | "hero";
  facetLabels: string[];
  priority?: boolean;
}) {
  const c = project.cover;
  const typo = <TypoCover slug={project.slug} year={project.year} facetLabels={facetLabels} title={project.title} />;
  if (!c) return typo;

  const alt = project.title;
  // Intrinsic width, never stretched; centered inside the frame.
  const cls = "block h-auto max-w-full";

  if (c.type === "video") {
    const v = videoFor(c.src);
    if (!v) return typo;
    return (
      <DeviceFrame frame={c.frame}>
        <VideoCover {...v} alt={alt} className={cls} />
      </DeviceFrame>
    );
  }

  const img = imageFor(c.src);
  if (!img) return typo;
  return (
    <DeviceFrame frame={c.frame}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated responsive set */}
      <img
        src={img.src}
        srcSet={img.srcSet}
        sizes={sizesFor(kind)}
        alt={alt}
        width={img.width}
        height={img.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cls}
      />
    </DeviceFrame>
  );
}
