export type NowStats = { repo: { name: string; url: string }; pushedAt: string; commits30d: number | null };

const API = "https://api.github.com";
const HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const DAY = 24 * 60 * 60 * 1000;

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return res.json();
}

type RawRepo = { name: unknown; html_url: unknown; pushed_at: unknown; fork: unknown };

async function commitCount(user: string, since: string, fetchImpl: typeof fetch): Promise<number | null> {
  try {
    const q = new URLSearchParams({ q: `author:${user} author-date:>=${since}`, per_page: "1" });
    const body = (await getJson(`${API}/search/commits?${q}`, fetchImpl)) as { total_count?: unknown };
    return typeof body.total_count === "number" && Number.isInteger(body.total_count) && body.total_count >= 0 ? body.total_count : null;
  } catch {
    return null;
  }
}

/** Unauthenticated, two requests. Any problem with the repo list → null (the caller renders nothing live). */
export async function fetchNowStats(user: string, fetchImpl: typeof fetch, now: Date): Promise<NowStats | null> {
  try {
    const list = await getJson(`${API}/users/${user}/repos?sort=pushed&direction=desc&per_page=10&type=owner`, fetchImpl);
    if (!Array.isArray(list)) return null;
    const first = (list as RawRepo[]).find((r) => r && r.fork === false);
    if (!first || typeof first.name !== "string" || typeof first.html_url !== "string" || typeof first.pushed_at !== "string") return null;
    if (!first.html_url.startsWith("https://github.com/")) return null;
    const pushed = new Date(first.pushed_at);
    if (Number.isNaN(pushed.getTime())) return null;
    const since = new Date(now.getTime() - 30 * DAY).toISOString().slice(0, 10);
    return {
      repo: { name: first.name, url: first.html_url },
      pushedAt: pushed.toISOString().slice(0, 10),
      commits30d: await commitCount(user, since, fetchImpl),
    };
  } catch {
    return null;
  }
}
