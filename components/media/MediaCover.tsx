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
  videoLabels,
}: {
  project: Project;
  facetLabels: string[];
  priority?: boolean;
} & (
  | { kind: "list"; videoLabels?: undefined }
  /** The hero may autoplay a looping video, which needs a translated pause/play control (WCAG 2.2.2). */
  | { kind: "hero"; videoLabels: { pause: string; play: string } }
)) {
  const c = project.cover;
  const typo = (
    <TypoCover
      slug={project.slug}
      year={project.year}
      facetLabels={facetLabels}
      title={project.title}
      variant={kind === "list" ? "compact" : "full"}
      decorative={kind === "hero"}
    />
  );
  if (!c) return typo;

  // The hero sits directly under the <h1> with the same title: an image there is decorative (empty alt).
  // List thumbnails and the hero video (which has a control that needs a named subject) keep the title.
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
    if (!videoLabels) return typo;
    return (
      <DeviceFrame frame={c.frame}>
        <VideoCover {...v} alt={alt} pauseLabel={videoLabels.pause} playLabel={videoLabels.play} className={cls} priority={priority} />
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
        sizes={sizesFor(kind, c.frame)}
        alt={kind === "hero" ? "" : alt}
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
