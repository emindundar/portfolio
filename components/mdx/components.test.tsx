import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, ...rest }: React.ComponentProps<"a">) => <a href={href} {...rest} /> }));

import { mdxComponents } from "./components";

const A = mdxComponents.a as unknown as React.ComponentType<React.ComponentProps<"a">>;
const show = (href: string) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <p>
        See <A href={href}>the docs</A>.
      </p>
    </NextIntlClientProvider>,
  );

describe("MDX a", () => {
  it("https links go through ExternalLink: new tab, note in the name, inline (no 44px flex box)", () => {
    show("https://nextjs.org/docs");
    const a = screen.getByRole("link", { name: "the docs (opens in a new tab)" });
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noreferrer noopener");
    expect(a.className).toBe("text-accent underline underline-offset-4");
  });
  it("internal links stay in the tab", () => {
    show("/en/work");
    expect(screen.getByRole("link", { name: "the docs" })).not.toHaveAttribute("target");
  });
  it("plain http fails loudly instead of shipping", () => {
    expect(() => show("http://example.com")).toThrow(/only https/);
  });
});
