import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // Headless Chromium is software GL (SwiftShader) by default, like CI, so the poster path runs.
    // PLAYWRIGHT_HARDWARE_GL=1 (macOS/Metal) exercises the real shader path locally;
    // PLAYWRIGHT_SOFTWARE_GL=1 forces software GL explicitly.
    ...(process.env.PLAYWRIGHT_HARDWARE_GL
      ? { launchOptions: { args: ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } }
      : process.env.PLAYWRIGHT_SOFTWARE_GL
        ? { launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu"] } }
        : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm exec next start -p 3100",
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The contact action validates and rate-limits but never calls Cloudflare or Resend.
    env: { CONTACT_DRY_RUN: "1" },
  },
});
