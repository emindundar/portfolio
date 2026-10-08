import { readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
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

async function run() {
  const sharp = (await import("sharp")).default;
  const srcRoot = "media-src";
  const outRoot = join("public", "media");
  const hasFfmpeg = (() => {
    try {
      execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  for (const group of readdirSync(srcRoot)) {
    const gdir = join(srcRoot, group);
    if (!statSync(gdir).isDirectory()) continue;
    mkdirSync(join(outRoot, group), { recursive: true });
    for (const file of readdirSync(gdir)) {
      const { name, ext } = parse(file);
      const src = join(gdir, file);
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())) {
        const meta = await sharp(src).metadata();
        for (const w of targetSizes(meta.width ?? 0)) {
          const out = join(outRoot, group, outputName(name, w));
          if (existsSync(out)) continue;
          await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
          console.log("img", out);
        }
      } else if (ext.toLowerCase() === ".mp4") {
        if (!hasFfmpeg) {
          console.warn("ffmpeg missing, skip", src);
          continue;
        }
        const mp4 = join(outRoot, group, `${name}.mp4`);
        const webm = join(outRoot, group, `${name}.webm`);
        const poster = join(outRoot, group, "poster-1280.webp");
        if (!existsSync(mp4))
          execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", "scale=-2:720", "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-an", "-movflags", "+faststart", mp4]);
        if (!existsSync(webm))
          execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", "scale=-2:720", "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-an", webm]);
        if (!existsSync(poster)) {
          // Homebrew ffmpeg ships without libwebp: grab the frame as PNG on stdout, encode with sharp.
          const frame = execFileSync("ffmpeg", ["-v", "error", "-ss", "1", "-i", src, "-frames:v", "1", "-vf", "scale=1280:-2", "-f", "image2pipe", "-c:v", "png", "-"], { maxBuffer: 64 * 1024 * 1024 });
          await sharp(frame).webp({ quality: 78 }).toFile(poster);
        }
        console.log("video", mp4, webm, poster);
      }
    }
  }
}

if (process.argv[1]?.endsWith("media.ts"))
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
