import { describe, it, expect } from "vitest";
import { localize } from "./site";

const items = [
  { id: 1, en: { title: "Hello", body: "b-en" }, tr: { title: "Merhaba", body: "b-tr" } },
  { id: 2, en: { title: "Only", caption: "c-en" }, tr: { title: "Sadece", caption: "c-tr" } },
];

describe("localize", () => {
  it("flattens the requested locale into text and keeps other fields", () => {
    const out = localize(items, "tr");
    expect(out[0]).toMatchObject({ id: 1, text: { title: "Merhaba", body: "b-tr" } });
    expect(out[1]?.text.caption).toBe("c-tr");
  });
  it("keeps both locale objects and does not mutate input", () => {
    const out = localize(items, "en");
    expect(out[0]?.text.title).toBe("Hello");
    expect(out[0]?.tr.title).toBe("Merhaba");
    expect(items[0]).not.toHaveProperty("text");
  });
  it("returns an empty array for no items", () => {
    expect(localize([], "en")).toEqual([]);
  });
});
