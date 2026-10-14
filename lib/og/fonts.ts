import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "assets", "fonts");

// Read synchronously at module scope. Under cacheComponents an image route is prerendered only if it finishes without
// waiting on uncached I/O: a readFile inside the function is a dynamic hole, and a module-scope readFile promise raced
// the prerender (the locale image came out static in one build and dynamic in the next).
const display = readFileSync(join(dir, "CabinetGrotesk-Extrabold.otf"));
const mono = readFileSync(join(dir, "JetBrainsMono-Regular.ttf"));

export async function ogFonts() {
  return [
    { name: "Cabinet Grotesk", data: display, weight: 800 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}
