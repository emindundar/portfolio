import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExternalLink } from "./ExternalLink";

const NOTE = "opens in a new tab";

/** Text a sighted user sees: everything except the sr-only boxes. */
function visibleText(el: Element) {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll(".sr-only").forEach((n) => n.remove());
  return copy.textContent;
}

describe("ExternalLink", () => {
  it("opens in a new tab without leaking the opener or referrer", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE}>GitHub</ExternalLink>);
    const a = screen.getByRole("link");
    expect(a).toHaveAttribute("href", "https://github.com/x");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("names the link '<label> (<note>)' with the note sr-only, separated by a no-break space", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE}>GitHub</ExternalLink>);
    const a = screen.getByRole("link", { name: "GitHub (opens in a new tab)" });
    const note = a.querySelector(".sr-only")!;
    // The separator is a no-break space inside the sr-only box: a plain leading space there is dropped from the
    // name, and a space in normal flow is visible (and underlined) after the label.
    expect(note.textContent).toBe("\u00A0(opens in a new tab)");
    expect(a.textContent).toBe("GitHub\u00A0(opens in a new tab)");
  });

  it("shows nothing after the label: no visible trailing space", () => {
    render(<ExternalLink href="https://github.com/x" newTabLabel={NOTE}>GitHub</ExternalLink>);
    expect(visibleText(screen.getByRole("link"))).toBe("GitHub");
  });

  it("inside a sentence the visible text runs straight into the punctuation", () => {
    const { container } = render(
      <p>
        Reach me on <ExternalLink href="https://x.com/y" newTabLabel={NOTE} unstyled>LinkedIn</ExternalLink>.
      </p>,
    );
    expect(visibleText(container)).toBe("Reach me on LinkedIn.");
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
