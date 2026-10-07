import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("en and tr have identical key sets", () => {
    expect(keys(tr).sort()).toEqual(keys(en).sort());
  });

  it("has the error boundary strings", () => {
    for (const msgs of [en, tr]) {
      expect(Object.keys(msgs.Error).sort()).toEqual(["body", "retry", "title"]);
    }
  });
});
