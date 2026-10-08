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
