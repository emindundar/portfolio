"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { createVisibilityController } from "@/components/canvas/visibility";

type Props = {
  mp4: string;
  webm: string;
  poster: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function VideoCover({ mp4, webm, poster, width, height, alt, className, priority = false }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const ctl = createVisibilityController(v, (visible) => {
      if (visible) void v.play()?.catch(() => {});
      else v.pause();
    });
    return () => ctl.dispose();
  }, [reduced]);

  if (reduced) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- pre-generated static poster
      <img src={poster} alt={alt} width={width} height={height} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" data-video-poster className={className} />
    );
  }
  return (
    <video
      ref={ref}
      data-video-cover
      className={className}
      muted
      playsInline
      loop
      preload="metadata"
      poster={poster}
      aria-label={alt}
      width={width}
      height={height}
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
