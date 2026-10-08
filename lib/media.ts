import manifest from "./media-manifest.json";

type ImageEntry = { widths: number[]; width: number; height: number };
type VideoEntry = { video: true; poster: string; width: number; height: number };
type Entry = ImageEntry | VideoEntry;

const entries = manifest as Record<string, Entry>;

export type ImageSource = { src: string; srcSet: string; width: number; height: number };
export type VideoSource = { mp4: string; webm: string; poster: string; width: number; height: number };

export function imageFor(base: string): ImageSource | null {
  const e = entries[base];
  if (!e || "video" in e || e.widths.length === 0) return null;
  const widths = [...e.widths].sort((a, b) => a - b);
  const largest = widths[widths.length - 1];
  return {
    src: `${base}-${largest}.webp`,
    srcSet: widths.map((w) => `${base}-${w}.webp ${Math.min(w, e.width)}w`).join(", "),
    width: e.width,
    height: e.height,
  };
}

export function videoFor(base: string): VideoSource | null {
  const e = entries[base];
  if (!e || !("video" in e)) return null;
  return { mp4: `${base}.mp4`, webm: `${base}.webm`, poster: e.poster, width: e.width, height: e.height };
}

/** Hero: the phone frame is capped at 20rem (app/[locale]/work/[slug]/page.tsx HERO_BOX), other frames span the page. */
export function sizesFor(kind: "list" | "hero", frame: "phone" | "browser" | "none" = "none"): string {
  if (kind === "list") return "(min-width: 768px) 40vw, 100vw";
  return frame === "phone" ? "min(20rem, 100vw)" : "100vw";
}
