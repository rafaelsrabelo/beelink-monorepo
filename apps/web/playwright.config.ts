import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)

/**
 * Runs against the built apps, the way they are served in production — `pnpm build` first, or the
 * e2e job in CI. Chromium only: one browser is enough to prove the journey, and three would cost
 * download time on every machine that clones this.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "pt-BR",
    // Also what makes the chart render at once instead of animating into place.
    reducedMotion: "reduce",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "api",
      command: "pnpm --filter api start",
      url: "http://localhost:3001/api/health",
      cwd: "../..",
      reuseExistingServer: !CI,
      timeout: 60_000,
      // A journey signs up and signs in several times in a row, which would trip the per-IP limit
      // this whole suite shares. The limit itself has its own e2e test, in apps/api.
      env: { ...process.env, AUTH_RATE_LIMIT_MAX: "1000" },
    },
    {
      name: "web",
      command: "pnpm --filter web start",
      url: "http://localhost:3000/login",
      cwd: "../..",
      reuseExistingServer: !CI,
      timeout: 120_000,
      env: { API_URL: "http://localhost:3001/api" },
    },
  ],
})
