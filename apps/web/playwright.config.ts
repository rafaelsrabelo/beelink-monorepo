import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)

/**
 * Ports of its own, never 3000/3001. A `pnpm dev` left open would otherwise be reused, and the
 * suite would run against whatever configuration that process happens to have — which is how it
 * started tripping the rate limit meant for real people.
 */
const WEB_PORT = 3100
const API_PORT = 3101

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
    baseURL: `http://localhost:${WEB_PORT}`,
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
      url: `http://localhost:${API_PORT}/api/health`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        PORT: String(API_PORT),
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
        WEB_URL: `http://localhost:${WEB_PORT}`,
        // A journey signs up and signs in several times over. The limit meant for real people has
        // its own e2e test, in apps/api.
        AUTH_RATE_LIMIT_MAX: "1000",
      },
    },
    {
      name: "web",
      command: `pnpm --filter web exec next start --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/login`,
      cwd: "../..",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
})
