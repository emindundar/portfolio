# media-src

Source images and videos for the site. `pnpm media` (`scripts/media.ts`) turns them into the
files under `public/media/`, which are committed (the script does not run on Vercel).

## Layout and naming

- `media-src/<group>/<name>.<ext>` → `public/media/<group>/<name>-{640,1280,1920}.webp`
- `<group>` is a project slug (`geotrack`, `gymai`, `karaoke-sync`, …) or a shared folder (`events`, `about`).
- `<name>` is kebab-case. A project cover is always `cover`, so `content/projects/<slug>.meta.json`
  points at `/media/<slug>/cover` (no size, no extension).
- Images: `.jpg`, `.jpeg`, `.png`, `.webp`. Only widths ≤ the source width are produced, so a source
  narrower than 1280 px yields just `-640.webp`. Nothing is upscaled: a source narrower than 640 px
  still gets a file named `-640.webp`, but that file keeps the source's own width. WebP quality 78.
- Video: `<name>.mp4` → `<name>.mp4` (H.264, crf 28, no audio, faststart), `<name>.webm` (VP9, crf 38)
  and `poster-1280.webp` (frame at 3 s). Height is capped at 720 px, never upscaled. One `.mp4` per
  group (the poster name is fixed); a second one makes the script fail. Needs `ffmpeg`/`ffprobe` on
  PATH; without them the script warns and skips videos. Homebrew ffmpeg has no WebP encoder, so the
  poster frame is piped to sharp.
- Manifest: every run rewrites `lib/media-manifest.json` (committed, keys sorted). Key = the
  extension-less path (`/media/<group>/<name>`). Images: `widths` (the suffixes that exist) and the
  real `width`/`height` of the largest file. Videos: `video: true`, `poster`, encoded `width`/`height`.
  Build `srcset` from `widths`; never assume all three sizes exist.

## Source rules

- Keep each source ≤ 2 MB: downscale photos to ~2400 px on the long side (JPEG q≈84) and bake in
  EXIF rotation before committing. Videos are committed as a pre-compressed mezzanine at native
  resolution (H.264 crf 23, no audio, ≤ 3 MB); `karaoke-sync/cover.mp4` is 2.7 MB, with the
  Next.js dev badge in the bottom-left corner masked by a black `drawbox` (x 0, y 945, 155×63).
  Command used for the mask:
  `ffmpeg -i karaokeApp.mp4 -vf "drawbox=x=0:y=945:w=155:h=63:color=black:t=fill" -c:v libx264 -crf 23 -preset slow -an -movflags +faststart media-src/karaoke-sync/cover.mp4`
- Crop out people who did not agree to be on the site (e.g. `events/devfest-denizli-25.jpg` is the
  banner only).
- Do not commit originals with location EXIF; re-encoding through sharp strips it.

## Running

```bash
pnpm media
```

Without ffmpeg/ffprobe, videos are not re-encoded; if their outputs already exist the previous
manifest entry is kept, otherwise the entry is omitted (both with a warning). `MEDIA_NO_FFMPEG=1
pnpm media` simulates that for testing.

An output is regenerated when it is missing or older than its source, so replacing a source file
and re-running is enough. Keep `public/media` under 15 MB in total.

## Privacy

Sources are committed and published. Before committing a source, crop or blur anything in it that identifies
or contacts a person: e-mail addresses, QR codes and third-party faces. Do it in the source file, not in the
generated output, so every regenerated width inherits it.
