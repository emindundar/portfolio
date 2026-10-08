# media-src

Source images and videos for the site. `pnpm media` (`scripts/media.ts`) turns them into the
files under `public/media/`, which are committed (the script does not run on Vercel).

## Layout and naming

- `media-src/<group>/<name>.<ext>` → `public/media/<group>/<name>-{640,1280,1920}.webp`
- `<group>` is a project slug (`geotrack`, `gymai`, `karaoke-sync`, …) or a shared folder (`events`, `about`).
- `<name>` is kebab-case. A project cover is always `cover`, so `content/projects/<slug>.meta.json`
  points at `/media/<slug>/cover` (no size, no extension).
- Images: `.jpg`, `.jpeg`, `.png`, `.webp`. Only widths ≤ the source width are produced; a source
  narrower than 640 px still gets a `-640.webp` at its own width (never upscaled). WebP quality 78.
- Video: `<name>.mp4` → `<name>.mp4` (720p H.264, crf 28, no audio, faststart), `<name>.webm`
  (720p VP9, crf 34) and `poster-1280.webp` (frame at 1 s). Needs `ffmpeg` on PATH; without it the
  script warns and skips videos. Homebrew ffmpeg has no WebP encoder, so the poster frame is piped
  to sharp.

## Source rules

- Keep each source ≤ 2 MB: downscale photos to ~2400 px on the long side (JPEG q≈84) and bake in
  EXIF rotation before committing. Videos are committed as a pre-compressed mezzanine at native
  resolution (H.264 crf 23, no audio); `karaoke-sync/cover.mp4` is 2.7 MB, the one exception.
- Crop out people who did not agree to be on the site (e.g. `events/devfest-denizli-25.jpg` is the
  banner only).
- Do not commit originals with location EXIF; re-encoding through sharp strips it.

## Running

```bash
pnpm media
```

Existing outputs are skipped. To regenerate a file, delete it from `public/media/` and run again.
Keep `public/media` under 15 MB in total.
