// @vitest-environment node
// velite imports esbuild, which fails its TextEncoder invariant under jsdom.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "velite";

// Fixture lives under node_modules/ so the config can resolve `velite` and stays gitignored.
const base = resolve(__dirname, "../node_modules/.tmp");
let dir: string;
let outDir: string;
let configPath: string;

beforeAll(() => {
  mkdirSync(base, { recursive: true });
  dir = mkdtempSync(join(base, "velite-strict-"));
  outDir = mkdtempSync(join(tmpdir(), "velite-out-"));
  mkdirSync(join(dir, "projects"));

  writeFileSync(
    join(dir, "projects/bad.meta.json"),
    JSON.stringify({
      slug: "bad",
      facets: ["mobile", "blockchain"],
      stack: ["Flutter"],
      year: 2026,
      role: "solo",
      order: 1,
      cover: { type: "image", src: "/x.webp", frame: "phone" },
    }),
  );
  writeFileSync(
    join(dir, "projects/bad.en.mdx"),
    "---\ntitle: Bad project\nsummary: A valid summary that is long enough.\n---\n\nBody.\n",
  );

  const schemaPath = resolve(__dirname, "schema").replace(/\\/g, "/");
  configPath = join(dir, "velite.config.ts");
  writeFileSync(
    configPath,
    `import { defineConfig, defineCollection } from "velite";
import { projectMetaSchema } from ${JSON.stringify(schemaPath)};

const projectMeta = defineCollection({
  name: "ProjectMeta",
  pattern: "projects/*.meta.json",
  schema: projectMetaSchema,
});

export default defineConfig({
  root: ${JSON.stringify(dir)},
  output: { data: ${JSON.stringify(outDir)}, assets: ${JSON.stringify(join(outDir, "assets"))}, base: "/static/", clean: true },
  collections: { projectMeta },
});
`,
  );
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
});

describe("velite strict build", () => {
  it("rejects when meta.json has an invalid facet, naming the field", async () => {
    // Velite throws a generic "Schema validation failed."; the field-level issue goes through console.warn.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "clear").mockImplementation(() => {});
    try {
      await expect(build({ config: configPath, strict: true })).rejects.toThrow(/Schema validation failed/);
      const output = warn.mock.calls.flat().join("\n");
      expect(output).toMatch(/facets/);
      expect(output).toMatch(/blockchain|Invalid/i);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
