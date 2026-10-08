import { readdirSync, readFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";
import { execFileSync } from "node:child_process";

export const SIZES = [640, 1280, 1920] as const;
export function targetSizes(srcWidth: number): number[] {
  const fit = SIZES.filter((w) => w <= srcWidth);
  return fit.length ? fit : [SIZES[0]];
}
export function outputName(base: string, width: number) {
  return `${base}-${width}.webp`;
}

export type ImageEntry = { widths: number[]; width: number; height: number };
export type VideoEntry = { video: true; poster: string; width: number; height: number };
export type Manifest = Record<string, ImageEntry | VideoEntry>;

/** Extension-less public path, the same string content meta uses as `cover.src`. */
export function manifestKey(group: string, name: string) {
  return `/media/${group}/${name}`;
}
/** Deterministic output: keys sorted, 2-space JSON, trailing newline. */
export function serializeManifest(manifest: Manifest) {
  const sorted: Manifest = {};
  for (const key of Object.keys(manifest).sort()) sorted[key] = manifest[key]!;
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
/** An output is regenerated when it is missing or older than its source. */
export function isStale(outMtimeMs: number | undefined, srcMtimeMs: number) {
  return outMtimeMs === undefined || outMtimeMs < srcMtimeMs;
}
/**
 * Encoding was skipped (ffmpeg/ffprobe unavailable): keep the previous manifest entry only if it is a
 * video entry and the encoded outputs are still on disk; otherwise the key is omitted.
 */
export function videoEntryWhenSkipped(prev: ImageEntry | VideoEntry | undefined, outputsExist: boolean): VideoEntry | undefined {
  return prev && "video" in prev && outputsExist ? prev : undefined;
}
export const videoScaleFilter = "scale=-2:'min(720,ih)'";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const MANIFEST_PATH = join("lib", "media-manifest.json");

function mtime(path: string): number | undefined {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
}

async function run() {
  const sharp = (await import("sharp")).default;
  const srcRoot = "media-src";
  const outRoot = join("public", "media");
  // MEDIA_NO_FFMPEG=1 simulates a machine without ffmpeg (for testing the skip path).
  const hasFfmpeg = (() => {
    if (process.env.MEDIA_NO_FFMPEG === "1") return false;
    try {
      execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
      execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();
  const previous: Manifest = (() => {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
    } catch {
      return {};
    }
  })();
  const manifest: Manifest = {};

  for (const group of readdirSync(srcRoot).sort()) {
    const gdir = join(srcRoot, group);
    if (!statSync(gdir).isDirectory()) continue;
    mkdirSync(join(outRoot, group), { recursive: true });
    const files = readdirSync(gdir).sort();
    const videos = files.filter((f) => parse(f).ext.toLowerCase() === ".mp4");
    if (videos.length > 1)
      throw new Error(`media-src/${group} has ${videos.length} .mp4 files (${videos.join(", ")}); only one per group is supported because the poster is always poster-1280.webp`);

    for (const file of files) {
      const { name, ext } = parse(file);
      const src = join(gdir, file);
      const srcMtime = statSync(src).mtimeMs;
      if (IMAGE_EXTS.includes(ext.toLowerCase())) {
        const meta = await sharp(src).metadata();
        const widths = targetSizes(meta.width ?? 0);
        for (const w of widths) {
          const out = join(outRoot, group, outputName(name, w));
          if (!isStale(mtime(out), srcMtime)) continue;
          await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
          console.log("img", out);
        }
        // Real pixel size of the largest emitted file (a "-640" file may be narrower than 640).
        const largest = await sharp(join(outRoot, group, outputName(name, widths[widths.length - 1]!))).metadata();
        manifest[manifestKey(group, name)] = { widths, width: largest.width ?? 0, height: largest.height ?? 0 };
      } else if (ext.toLowerCase() === ".mp4") {
        const key = manifestKey(group, name);
        const mp4 = join(outRoot, group, `${name}.mp4`);
        const webm = join(outRoot, group, `${name}.webm`);
        const poster = join(outRoot, group, "poster-1280.webp");
        if (!hasFfmpeg) {
          const outputsExist = [mp4, webm, poster].every((f) => mtime(f) !== undefined);
          const kept = videoEntryWhenSkipped(previous[key], outputsExist);
          if (kept) {
            manifest[key] = kept;
            console.warn("ffmpeg/ffprobe missing: not re-encoding", src, "- kept existing outputs and manifest entry");
          } else console.warn("ffmpeg/ffprobe missing: skipped", src, "- no manifest entry written");
          continue;
        }
        let encoded = false;
        if (isStale(mtime(mp4), srcMtime)) {
          encoded = true;
          execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", videoScaleFilter, "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-an", "-movflags", "+faststart", mp4]);
        }
        if (isStale(mtime(webm), srcMtime)) {
          encoded = true;
          execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", videoScaleFilter, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-an", webm]);
        }
        if (isStale(mtime(poster), srcMtime)) {
          encoded = true;
          // Homebrew ffmpeg ships without libwebp: grab the frame as PNG on stdout, encode with sharp.
          const frame = execFileSync("ffmpeg", ["-v", "error", "-ss", "3", "-i", src, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 64 * 1024 * 1024 });
          await sharp(frame).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toFile(poster);
        }
        const [vw, vh] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", mp4])
          .toString()
          .trim()
          .split(",")
          .map(Number);
        manifest[key] = { video: true, poster: `/media/${group}/poster-1280.webp`, width: vw ?? 0, height: vh ?? 0 };
        if (encoded) console.log("video", mp4, webm, poster);
      }
    }
  }

  writeFileSync(MANIFEST_PATH, serializeManifest(manifest));
  console.log("manifest", MANIFEST_PATH, Object.keys(manifest).length, "entries");
}

if (process.argv[1]?.endsWith("media.ts"))
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
