import { defineConfig, devices } from "@playwright/test";
import { testEnv } from "./test/env";

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Most players come from phones (spec, section 1).
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Always a production build on its own port with the test database:
    // e2e checks what players get, and never touches the dev server or data.
    command: `tsx e2e/prepare-database.ts && npm run build && npm run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ...testEnv, SITE_URL: baseURL },
  },
});
