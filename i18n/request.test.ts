// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const rootLocale = vi.fn<() => Promise<string | undefined>>();
vi.mock("next/root-params", () => ({ locale: () => rootLocale() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// getRequestConfig is an identity wrapper; keep the callback so the test can call it with a spy-able params object.
vi.mock("next-intl/server", () => ({ getRequestConfig: <T>(fn: T) => fn }));

const { default: requestConfig, resolveLocale } = await import("./request");
type Params = Parameters<typeof requestConfig>[0];

// Mirrors next-intl's params: `requestLocale` is a getter whose read calls headers() on a real request.
function paramsWithSpy(requestLocale: string | undefined, locale?: string) {
  const read = vi.fn(() => Promise.resolve(requestLocale));
  const params = {
    locale,
    get requestLocale() {
      return read();
    },
  } as Params;
  return { params, read };
}

describe("resolveLocale", () => {
  it("does not read the request locale when a root locale exists", async () => {
    const read = vi.fn(() => Promise.resolve("tr"));
    expect(await resolveLocale("en", read)).toBe("en");
    expect(read).not.toHaveBeenCalled();
  });

  it("falls back to the request locale without a root param", async () => {
    const read = vi.fn(() => Promise.resolve("tr"));
    expect(await resolveLocale(undefined, read)).toBe("tr");
    expect(read).toHaveBeenCalledOnce();
  });

  it("returns null for an unknown locale", async () => {
    expect(await resolveLocale("xx", () => Promise.resolve(undefined))).toBeNull();
    expect(await resolveLocale(undefined, () => Promise.resolve("xx"))).toBeNull();
  });
});

describe("request config", () => {
  beforeEach(() => rootLocale.mockReset());

  it("never touches params.requestLocale under a root locale (static pages)", async () => {
    rootLocale.mockResolvedValue("tr");
    const { params, read } = paramsWithSpy("en");
    const config = await requestConfig(params);
    expect(config.locale).toBe("tr");
    expect(read).not.toHaveBeenCalled();
  });

  it("never touches params.requestLocale when an explicit locale is passed", async () => {
    const { params, read } = paramsWithSpy("tr", "en");
    expect((await requestConfig(params)).locale).toBe("en");
    expect(read).not.toHaveBeenCalled();
    expect(rootLocale).not.toHaveBeenCalled();
  });

  it("reads params.requestLocale only without a root param (global 404)", async () => {
    rootLocale.mockResolvedValue(undefined);
    const { params, read } = paramsWithSpy("tr");
    expect((await requestConfig(params)).locale).toBe("tr");
    expect(read).toHaveBeenCalledOnce();
  });

  it("throws notFound() for an invalid locale", async () => {
    rootLocale.mockResolvedValue(undefined);
    const { params } = paramsWithSpy("xx");
    await expect(requestConfig(params)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
