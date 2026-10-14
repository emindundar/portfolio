import { expect, type Page } from "@playwright/test";

const CSP_MESSAGE = /Content Security Policy|Refused to (load|execute|apply|connect|frame)/;

/**
 * Collects CSP console messages and `securitypolicyviolation` events for the whole test.
 * Call before the first navigation; await the returned check at the end.
 */
export async function watchCsp(page: Page) {
  const messages: string[] = [];
  page.on("console", (m) => {
    if (CSP_MESSAGE.test(m.text())) messages.push(m.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return async () => {
    const events = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    expect([...messages, ...events]).toEqual([]);
  };
}
