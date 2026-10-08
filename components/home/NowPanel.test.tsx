import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { NowStats } from "@/lib/github";

const stats = vi.hoisted(() => ({ value: null as NowStats | null }));
vi.mock("@/lib/now", () => ({ getNowStats: async () => stats.value }));
vi.mock("@/lib/content/site", () => ({ getNow: () => ({ updated: "2026-10-08", text: "Building this site in the open." }) }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const en = (await import("@/messages/en.json")).default;
  return { getTranslations: async (ns: string) => createTranslator({ locale: "en", messages: en, namespace: ns as "Now" }) };
});

import { NowPanel } from "./NowPanel";

const show = async (value: NowStats | null) => {
  stats.value = value;
  return render(await NowPanel({ locale: "en" }));
};

describe("NowPanel", () => {
  it("always shows the manual line with its date", async () => {
    const { container } = await show(null);
    expect(screen.getByRole("heading", { level: 2, name: "Now" })).toBeInTheDocument();
    expect(screen.getByText("Building this site in the open.")).toBeInTheDocument();
    expect(container.querySelector('time[datetime="2026-10-08"]')).toHaveTextContent("8 Oct 2026");
    expect(container.querySelector("[data-now-live]")).toBeNull();
  });
  it("adds the live row when GitHub answered", async () => {
    const { container } = await show({ repo: { name: "portfolio", url: "https://github.com/emindundar/portfolio" }, pushedAt: "2026-10-07", commits30d: 42 });
    const live = container.querySelector("[data-now-live]")!;
    expect(live.querySelector("a")).toHaveAttribute("href", "https://github.com/emindundar/portfolio");
    expect(live.querySelector('time[datetime="2026-10-07"]')).toHaveTextContent("7 Oct 2026");
    expect(live).toHaveTextContent("42 public commits in the last 30 days");
  });
  it("omits the commit count when it is unknown and pluralizes one", async () => {
    const base = { repo: { name: "portfolio", url: "https://github.com/emindundar/portfolio" }, pushedAt: "2026-10-07" };
    const a = await show({ ...base, commits30d: null });
    expect(a.container.querySelector("[data-now-live]")).not.toHaveTextContent("commit");
    a.unmount();
    const b = await show({ ...base, commits30d: 1 });
    expect(b.container.querySelector("[data-now-live]")).toHaveTextContent("1 public commit in the last 30 days");
  });
});
