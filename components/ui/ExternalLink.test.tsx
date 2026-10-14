import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExternalLink } from "./ExternalLink";

const NOTE = "opens in a new tab";

describe("ExternalLink", () => {
  it("opens in a new tab without leaking the opener or referrer", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE}>GitHub</ExternalLink>);
    const a = screen.getByRole("link");
    expect(a).toHaveAttribute("href", "https://github.com/x");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("names the link '<label> (<note>)' with the note sr-only and no whitespace inside the sr-only box", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE}>GitHub</ExternalLink>);
    const a = screen.getByRole("link", { name: "GitHub (opens in a new tab)" });
    const note = a.querySelector(".sr-only")!;
    expect(note.textContent).toBe("(opens in a new tab)");
    // The separating space sits in normal flow, before the absolutely positioned sr-only box.
    expect(a.textContent).toBe("GitHub (opens in a new tab)");
  });

  it("arrow adds an aria-hidden ↗ that stays out of the name", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE} arrow>GitHub</ExternalLink>);
    const a = screen.getByRole("link", { name: "GitHub (opens in a new tab)" });
    const arrow = a.querySelector('[aria-hidden="true"]')!;
    expect(arrow.textContent).toBe(" ↗");
  });

  it("has no arrow by default", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE}>GitHub</ExternalLink>);
    expect(screen.getByRole("link").querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("merges className with the default 44px target classes", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE} className="font-mono text-accent">GitHub</ExternalLink>);
    const cls = screen.getByRole("link").className.split(" ");
    expect(cls).toEqual(expect.arrayContaining(["inline-flex", "min-h-11", "items-center", "underline", "font-mono", "text-accent"]));
  });

  it("unstyled drops the defaults and keeps only className (inline text, footer)", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE} unstyled className="underline">GitHub</ExternalLink>);
    expect(screen.getByRole("link").className).toBe("underline");
  });

  it.each(["javascript:alert(1)", "http://example.com", "//example.com", "/en/work", "mailto:a@b.c", "data:text/html,x"])("refuses %s", (href) => {
    expect(() => render(<ExternalLink href={href} newTabLabel={NOTE}>x</ExternalLink>)).toThrow(/only https/);
  });
});
