import { describe, it, expect, vi } from "vitest";
import { fetchNowStats } from "./github";

const NOW = new Date("2026-10-08T12:00:00Z");
const repo = (over: object = {}) => ({ name: "portfolio", html_url: "https://github.com/emindundar/portfolio", pushed_at: "2026-10-07T21:14:03Z", fork: false, private: false, ...over });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function routes(map: { repos?: () => Response | Promise<Response>; search?: () => Response | Promise<Response> }) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes("/search/commits")) return (map.search ?? (() => json({ total_count: 42 })))();
    if (u.includes("/repos")) return (map.repos ?? (() => json([repo()])))();
    throw new Error(`unexpected url ${u}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("fetchNowStats", () => {
  it("returns the last pushed repo, its UTC date and the 30-day commit count", async () => {
    const f = routes({});
    expect(await fetchNowStats("emindundar", f, NOW)).toEqual({
      repo: { name: "portfolio", url: "https://github.com/emindundar/portfolio" }, pushedAt: "2026-10-07", commits30d: 42,
    });
  });
  it("asks for repos sorted by push and commits authored since 30 days ago", async () => {
    const f = routes({});
    await fetchNowStats("emindundar", f, NOW);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain("https://api.github.com/users/emindundar/repos?sort=pushed&direction=desc&per_page=10&type=owner");
    expect(urls.find((u) => u.includes("/search/commits"))).toBe(
      "https://api.github.com/search/commits?q=author%3Aemindundar+author-date%3A%3E%3D2026-09-08&per_page=1",
    );
    for (const c of f.mock.calls) expect((c[1] as RequestInit).headers).toMatchObject({ Accept: "application/vnd.github+json" });
  });
  it("skips forks and takes the next repo", async () => {
    const f = routes({ repos: () => json([repo({ name: "some-fork", fork: true }), repo({ name: "geotrack", html_url: "https://github.com/emindundar/geotrack" })]) });
    expect((await fetchNowStats("emindundar", f, NOW))?.repo.name).toBe("geotrack");
  });
  it("keeps the repo when only the commit search fails", async () => {
    for (const search of [() => json({ message: "rate limit" }, 403), () => json({ total_count: "many" }), async () => { throw new Error("down"); }]) {
      const r = await fetchNowStats("emindundar", routes({ search }), NOW);
      expect(r).toMatchObject({ repo: { name: "portfolio" }, commits30d: null });
    }
  });
  it.each([
    ["403 rate limit", () => json({ message: "API rate limit exceeded" }, 403)],
    ["500", () => json({}, 500)],
    ["network error", async () => { throw new Error("ENOTFOUND"); }],
    ["not an array", () => json({ message: "Not Found" })],
    ["empty list", () => json([])],
    ["only forks", () => json([repo({ fork: true })])],
    ["bad date", () => json([repo({ pushed_at: "yesterday" })])],
    ["url off github.com", () => json([repo({ html_url: "javascript:alert(1)" })])],
    ["html body", () => new Response("<html>")],
  ])("is null when repos answer: %s", async (_n, repos) => {
    expect(await fetchNowStats("emindundar", routes({ repos }), NOW)).toBeNull();
  });
});
