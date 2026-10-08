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
  const typo = (
    <TypoCover
      slug={project.slug}
      year={project.year}
      facetLabels={facetLabels}
      title={project.title}
      variant={kind === "list" ? "compact" : "full"}
    />
  );
  if (!c) return typo;

  const alt = project.title;
  // Intrinsic width, never stretched; centered inside the frame.
  const cls = "block h-auto max-w-full";

  if (c.type === "video") {
    const v = videoFor(c.src);
    if (!v) return typo;
    if (kind === "list") {
      // Thumbnail: the still poster only — no video element, no autoplay, no client JS in list rows.
      return (
        <DeviceFrame frame={c.frame}>
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated static poster */}
          <img src={v.poster} alt={alt} width={v.width} height={v.height} loading="lazy" decoding="async" data-video-poster className={cls} />
        </DeviceFrame>
      );
    }
    return (
      <DeviceFrame frame={c.frame}>
        <VideoCover {...v} alt={alt} className={cls} priority={priority} />
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
