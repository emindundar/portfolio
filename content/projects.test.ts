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
  it("featured set is geotrack, kipgoz, gymai, karaoke-sync", () => {
    expect(metas.filter((m) => m.featured).map((m) => m.slug).sort()).toEqual(["geotrack", "gymai", "karaoke-sync", "kipgoz"]);
  });
  it("order values are 1..7 and unique", () => {
    expect(metas.map((m) => m.order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it.each(slugs.flatMap((slug) => [`${slug}.en.mdx`, `${slug}.tr.mdx`]))("%s body is 150-380 words", (file) => {
    const body = readFileSync(join(dir, file), "utf8").replace(/^---[\s\S]*?---/, "").replace(/^## .+$/gm, "");
    const words = body.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    expect(words, file).toBeGreaterThanOrEqual(150);
    expect(words, file).toBeLessThanOrEqual(380);
  });
});
