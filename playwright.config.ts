import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
