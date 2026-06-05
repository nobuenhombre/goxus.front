import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "BACK_CONFIG=configs/e2e/config.yaml make -C .. run-back",
      url: "http://localhost:8080/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "make -C .. run-front",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})