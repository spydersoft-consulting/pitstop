import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const appHostProject = path.resolve(import.meta.dirname, "../../../Spydersoft.PitStop.AppHost");
// The web project's https endpoint (9081) isn't actually reachable under Aspire orchestration in
// this setup (a pre-existing condition also affecting the api project's own https endpoint), so
// the AppHost's mock-OIDC wiring sets OidcProxySettings__AlwaysRedirectToHttps=false for Testing,
// keeping everything on the plain-http endpoint (9080) that does work.
const baseUrl = process.env.PITSTOP_WEB_BASE_URL ?? "http://localhost:9080";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `dotnet run --project "${appHostProject}" --launch-profile Testing`,
    url: `${baseUrl}/livez`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
