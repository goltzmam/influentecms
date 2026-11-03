import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env.local")) loadEnvFile(".env.local");
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180000,
  workers: 1,
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node --env-file=.env.local node_modules/next/dist/bin/next start -p 3100 -H 127.0.0.1",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
