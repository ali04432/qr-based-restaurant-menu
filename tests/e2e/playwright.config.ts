import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    // Use pre-installed native Chrome or Edge on Windows to skip 250MB Chromium download
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome'
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      }
    }
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      port: 4000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run dev:web',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
