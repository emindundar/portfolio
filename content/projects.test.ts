// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = "content/projects";
const slugs = [...new Set(readdirSync(dir).map((f) => f.split(".")[0] ?? ""))];

describe("project content integrity", () => {
  it("has exactly seven projects", () => {
    expect([...slugs].sort()).toEqual(["bio-astral", "cursor-notion-mcp", "geotrack", "gymai", "karaoke-sync", "kipgoz", "notifyx"]);
  });
  it.each(slugs)("%s has meta, en and tr files", (slug) => {
    for (const f of [`${slug}.meta.json`, `${slug}.en.mdx`, `${slug}.tr.mdx`]) expect(existsSync(join(dir, f)), f).toBe(true);
  });
  it.each(slugs)("%s mdx bodies use the fixed section headings in order", (slug) => {
    const en = readFileSync(join(dir, `${slug}.en.mdx`), "utf8");
    const tr = readFileSync(join(dir, `${slug}.tr.mdx`), "utf8");
    const heads = (s: string) => [...s.matchAll(/^## (.+)$/gm)].map((m) => (m[1] ?? "").trim());
    expect(heads(en)).toEqual(["Problem", "Role", "Architecture", "Decisions", "Outcome"]);
    expect(heads(tr)).toEqual(["Problem", "Rol", "Mimari", "Kararlar", "Sonuç"]);
  });
  it.each(slugs)("%s cover assets exist when declared", (slug) => {
    const meta = JSON.parse(readFileSync(join(dir, `${slug}.meta.json`), "utf8"));
    if (!meta.cover) return;
    const base = join("public", meta.cover.src.replace(/^\//, ""));
    if (meta.cover.type === "image") expect(existsSync(`${base}-640.webp`), `${base}-640.webp`).toBe(true);
    else {
      expect(existsSync(`${base}.mp4`)).toBe(true);
      expect(existsSync(join("public", "media", slug, "poster-1280.webp"))).toBe(true);
    }
  });
});

const metas = slugs.map((slug) => JSON.parse(readFileSync(join(dir, `${slug}.meta.json`), "utf8")) as {
  slug: string;
  featured?: boolean;
  order: number;
  cover?: { src: string };
  gallery?: { src: string; alt: { en: string; tr: string } }[];
});

describe("project content cross-references", () => {
  it("every services.json caseSlug is a project slug", () => {
    const services = JSON.parse(readFileSync("content/services.json", "utf8")) as { caseSlug: string }[];
    for (const s of services) expect(slugs, s.caseSlug).toContain(s.caseSlug);
  });
  it("every declared cover.src is a key in the media manifest", () => {
    const manifest = JSON.parse(readFileSync("lib/media-manifest.json", "utf8")) as Record<string, unknown>;
    for (const m of metas) if (m.cover) expect(Object.keys(manifest), m.slug).toContain(m.cover.src);
  });
  it("every gallery image is in the media manifest with its file on disk and a distinct alt per locale", () => {
    const manifest = JSON.parse(readFileSync("lib/media-manifest.json", "utf8")) as Record<string, { widths?: number[] }>;
    for (const m of metas)
      for (const g of m.gallery ?? []) {
        const widths = manifest[g.src]?.widths ?? [];
        expect(widths.length, `${m.slug}: ${g.src}`).toBeGreaterThan(0);
        for (const w of widths) expect(existsSync(join("public", `${g.src}-${w}.webp`)), `${g.src}-${w}.webp`).toBe(true);
        expect(g.alt.en.length, `${g.src} alt.en`).toBeGreaterThanOrEqual(5);
        expect(g.alt.tr.length, `${g.src} alt.tr`).toBeGreaterThanOrEqual(5);
        expect(g.alt.tr, `${g.src}: tr alt is a translation`).not.toBe(g.alt.en);
      }
    expect(metas.find((m) => m.slug === "gymai")?.gallery?.map((g) => g.src)).toEqual(["/media/gymai/poster", "/media/gymai/screens-right"]);
  });
  it("gymai thesis poster is the cropped one (header with names and e-mail addresses cut off)", () => {
    // The uncropped 746×1054 source renders at 640×904; the crop starts below the header block.
    const manifest = JSON.parse(readFileSync("lib/media-manifest.json", "utf8")) as Record<string, { height: number }>;
    expect(manifest["/media/gymai/poster"]?.height).toBeLessThan(900);
  });
  it("featured set is geotrack, kipgoz, gymai, karaoke-sync", () => {
    expect(metas.filter((m) => m.featured).map((m) => m.slug).sort()).toEqual(["geotrack", "gymai", "karaoke-sync", "kipgoz"]);
  });
  it("order values are 1..7 and unique", () => {
    expect(metas.map((m) => m.order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it.each(slugs.flatMap((slug) => [`${slug}.en.mdx`, `${slug}.tr.mdx`]))("%s body is 180-350 words", (file) => {
    const body = readFileSync(join(dir, file), "utf8").replace(/^---[\s\S]*?---/, "").replace(/^## .+$/gm, "");
    const words = body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    expect(words, file).toBeGreaterThanOrEqual(180);
    expect(words, file).toBeLessThanOrEqual(350);
  });
});
