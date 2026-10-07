import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeToggle } from "./ThemeToggle";
import en from "@/messages/en.json";

function renderToggle() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ThemeToggle />
    </NextIntlClientProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = "theme=; Max-Age=0; Path=/";
  });

  it("sets data-theme and cookie to light when current is dark", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.cookie).toContain("theme=light");
    expect(screen.getByRole("button", { name: /theme/i })).toHaveAccessibleName("Theme: Dark");
  });

  it("toggles back to dark", () => {
    document.documentElement.setAttribute("data-theme", "light");
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    expect(screen.getByRole("button", { name: /theme/i })).toHaveAccessibleName("Theme: Light");
  });
});
