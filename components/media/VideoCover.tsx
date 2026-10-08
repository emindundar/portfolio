"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { createVisibilityController } from "@/components/canvas/visibility";

type Props = {
  mp4: string;
  webm: string;
  poster: string;
  width: number;
  height: number;
  alt: string;
  /** Translated names of the pause/play toggle (messages `Case.videoPause` / `Case.videoPlay`). */
  pauseLabel: string;
  playLabel: string;
  className?: string;
  priority?: boolean;
};

export function VideoCover({ mp4, webm, poster, width, height, alt, pauseLabel, playLabel, className, priority = false }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  // WCAG 2.2.2: the loop can be stopped by the user. The ref mirrors the state for the visibility controller,
  // which must not resume a video the user paused.
  const [paused, setPaused] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const ctl = createVisibilityController(v, (visible) => {
      if (visible && !userPaused.current) void v.play()?.catch(() => {});
      else v.pause();
    });
    return () => ctl.dispose();
  }, [reduced]);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    const next = !userPaused.current;
    userPaused.current = next;
    setPaused(next);
    if (next) v.pause();
    else void v.play()?.catch(() => {});
  }

  // The poster <img> is the one element that exists in the server HTML, under reduced motion and with motion: it is
  // the LCP candidate and is never swapped. With motion the <video> is laid over it without a `poster` attribute and
  // 1px inside the poster's box: a paint must be strictly larger to become a new LCP candidate, and at equal size
  // sub-pixel rounding made the video's first frame (after hydration and the media download) win. Until that
  // frame the video is transparent, so the poster shows through.
  return (
    <div className="relative max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated static poster */}
      <img
        src={poster}
        alt={reduced ? alt : ""}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        data-video-poster
        className={className}
      />
      {!reduced && (
        <>
          <video
            ref={ref}
            data-video-cover
            data-paused={paused ? "" : undefined}
            className="absolute inset-px h-[calc(100%-2px)] w-[calc(100%-2px)]"
            muted
            playsInline
            loop
            preload="metadata"
            aria-label={alt}
          >
            {/* MP4 first: for this clip it is the smaller file (989 KB vs 1069 KB WebM) and every browser that plays
                WebM here also plays H.264; WebM stays as the fallback for builds without the H.264 decoder. */}
            <source src={mp4} type="video/mp4" />
            <source src={webm} type="video/webm" />
          </video>
          {/* Inset by 0.5rem so the focus outline is not clipped by the frame's overflow-hidden. The accessible name
              swaps with the state (no aria-pressed: name and state would contradict each other). */}
          <button
            type="button"
            data-video-toggle
            onClick={toggle}
            className="absolute right-2 bottom-2 inline-flex min-h-11 min-w-11 items-center justify-center border border-line bg-bg px-3 font-mono text-xs uppercase text-fg hover:text-accent"
          >
            {paused ? playLabel : pauseLabel}
          </button>
        </>
      )}
    </div>
  );
}
