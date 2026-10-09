import { test, expect, type Page } from "@playwright/test";

// The server keeps one in-memory limiter (5/hour/IP) and local runs reuse the server, so every page gets a
// forwarded address nobody has used before: random 10.x.y.z per test, never repeated across runs in practice.
const freshIp = () => `10.${[0, 0, 0].map(() => 1 + Math.floor(Math.random() * 254)).join(".")}`;

async function open(page: Page, path = "/en/contact") {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `${freshIp()}, 203.0.113.7` });
  await page.goto(path);
  await expect(page.locator("form[data-contact-form]")).toBeVisible();
}
async function fill(page: Page, over: Partial<Record<"Name" | "E-mail" | "Message", string>> = {}) {
  const v = { Name: "Ada Lovelace", "E-mail": "ada@example.com", Message: "I would like to talk about a project.", ...over };
  for (const [label, value] of Object.entries(v)) await page.getByLabel(label, { exact: true }).fill(value);
}
const send = (page: Page) => page.getByRole("button", { name: "Send message" }).click();
const alert = (page: Page) => page.locator('[data-contact-status="error"]');

test.describe("/contact", () => {
  test("valid submission shows the success status and removes the form", async ({ page }) => {
    await open(page);
    await fill(page);
    await send(page);
    const status = page.locator('[data-contact-status="success"]');
    await expect(status).toHaveText(/Message sent/);
    await expect(status).toBeFocused();
    await expect(page.locator("form[data-contact-form]")).toHaveCount(0);
    await page.getByRole("link", { name: "Send another message" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
  });

  test("invalid e-mail: inline error, focus on the field, other values kept", async ({ page }) => {
    await open(page);
    await fill(page, { "E-mail": "not-an-email" });
    await page.getByLabel("Budget (optional)").selectOption("5k-15k");
    await send(page);
    await expect(alert(page)).toHaveText(/Some fields need attention/);
    const email = page.getByLabel("E-mail", { exact: true });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toBeFocused();
    await expect(email).toHaveValue("not-an-email");
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("I would like to talk about a project.");
    await expect(page.getByLabel("Budget (optional)")).toHaveValue("5k-15k");
    // Second round: the corrected form goes through.
    await email.fill("ada@example.com");
    await send(page);
    await expect(page.locator('[data-contact-status="success"]')).toBeFocused();
  });

  test("honeypot filled: looks like success even for invalid input, and is invisible to people", async ({ page }) => {
    await open(page);
    const trap = page.locator('input[name="contact_ref"]');
    await expect(trap).not.toBeInViewport();
    // An invalid e-mail would normally be refused; success proves the bot branch skipped validation.
    await fill(page, { "E-mail": "not-an-email" });
    await trap.evaluate((el: HTMLInputElement) => { el.value = "Acme Bots Ltd"; });
    await send(page);
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
  });

  test("keyboard only: tab order skips the honeypot and Enter on the button submits", async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "hardware keyboard flow");
    await open(page);
    await page.getByLabel("Name", { exact: true }).focus();
    await page.keyboard.type("Ada Lovelace");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
    await page.keyboard.type("ada@example.com");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Message", { exact: true })).toBeFocused();
    await page.keyboard.type("I would like to talk about a project.");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Budget (optional)")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Send message" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
  });

  test("sixth message in an hour from one address is refused, text kept, alert focused", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": freshIp() });
    for (let i = 0; i < 5; i++) {
      await page.goto("/en/contact");
      await fill(page);
      await send(page);
      await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
    }
    await page.goto("/en/contact");
    await fill(page);
    await send(page);
    await expect(alert(page)).toHaveText(/Too many messages/);
    await expect(alert(page)).toBeFocused();
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("I would like to talk about a project.");
  });

  test("privacy notice sits under the submit button and names both processors", async ({ page }) => {
    await open(page);
    const note = page.locator("form[data-contact-form] [data-contact-privacy]");
    await expect(note).toContainText("through Resend");
    await expect(note).toContainText("Cloudflare Turnstile");
    const button = await page.getByRole("button", { name: "Send message" }).boundingBox();
    expect((await note.boundingBox())!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
    await expect(page.getByRole("complementary").getByRole("link", { name: "LinkedIn (opens in a new tab)", exact: true })).toBeVisible();
    const mail = page.getByRole("complementary").getByRole("link", { name: /@/ });
    await expect(mail).toHaveAttribute("href", /^mailto:[^@\s]+@[^@\s]+$/);
    await expect(mail).not.toHaveAttribute("target", "_blank");
    await open(page, "/tr/contact");
    await expect(page.locator("[data-contact-privacy]")).toContainText("Resend aracılığıyla");
    await expect(page.locator("[data-contact-privacy]")).toContainText("Cloudflare Turnstile");
  });

  test("tr is localized and nav marks the page current", async ({ page }) => {
    await open(page, "/tr/contact");
    await expect(page.getByRole("heading", { level: 1, name: "İletişim" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mesajı gönder" })).toBeVisible();
    await expect(page).toHaveTitle(/İletişim/);
    await expect(page.getByRole("navigation", { name: /ana gezinme/i }).getByRole("link", { name: "İletişim" })).toHaveAttribute("aria-current", "page");
  });

  test("fits 360px without horizontal scroll and controls are at least 44px tall", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const el of [page.getByLabel("Name", { exact: true }), page.getByLabel("Budget (optional)"), page.getByRole("button", { name: "Send message" })]) {
      expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("controls are square and unshadowed", async ({ page }) => {
    await open(page);
    for (const el of [page.getByLabel("Name", { exact: true }), page.getByLabel("Message", { exact: true }), page.getByLabel("Budget (optional)"), page.getByRole("button", { name: "Send message" })]) {
      expect(await el.evaluate((n) => [getComputedStyle(n).borderRadius, getComputedStyle(n).boxShadow])).toEqual(["0px", "none"]);
    }
  });

  test("home and services CTAs reach the page (no more dead link)", async ({ page }) => {
    for (const from of ["/en", "/en/services"]) {
      await page.goto(from);
      await page.locator('main a[href="/en/contact"]').first().click();
      await expect(page).toHaveURL(/\/en\/contact$/);
      await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
    }
  });
});

test.describe("/contact without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the form still posts and the server answers with the success page", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": freshIp() });
    await page.goto("/en/contact");
    // Playwright's text selectors skip <noscript>, so address the paragraph structurally.
    const note = page.locator("form[data-contact-form] noscript p");
    await expect(note).toBeVisible();
    await expect(note.getByRole("link")).toHaveAttribute("href", "https://www.linkedin.com/in/emindundar");
    await fill(page);
    await send(page);
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
  });
  test("a validation error comes back with the typed values", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": freshIp() });
    await page.goto("/en/contact");
    await fill(page, { Message: "short" });
    await send(page);
    await expect(alert(page)).toHaveText(/Some fields need attention/);
    await expect(page.getByLabel("Message", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Ada Lovelace");
  });
});
