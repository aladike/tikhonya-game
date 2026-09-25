import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  workers: 1,
  maxFailures: process.env.CI ? 1 : 0,
  testDir: "./tests",
  testMatch: "*.spec.ts",
  timeout: process.env.CI ? 120000 : 30000,
  expect: { timeout: process.env.CI ? 15000 : 5000 },
  use: {
    headless: !process.env.CI,
    baseURL: "http://127.0.0.1:5173/tikhonya-game/",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-webgl"] },
      },
    },
    ...(process.platform !== "darwin" || process.env.GAME_TEST_FIREFOX
      ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }]
      : []),
    { name: "webkit", use: { ...devices["iPad (gen 7) landscape"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173/tikhonya-game/",
    reuseExistingServer: true,
  },
});
