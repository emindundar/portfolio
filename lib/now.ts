import { cacheLife } from "next/cache";
import { GITHUB_USER } from "@/lib/site";
import { fetchNowStats, type NowStats } from "@/lib/github";

// ISR-style: the route revalidates at most once an hour, and every deploy starts from a fresh build-time fetch.
/** Cached for an hour (spec §2.6). Failures are cached as null for the same hour: the page never waits on GitHub twice. */
export async function getNowStats(): Promise<NowStats | null> {
  "use cache";
  cacheLife("hours");
  return fetchNowStats(GITHUB_USER, fetch, new Date());
}
