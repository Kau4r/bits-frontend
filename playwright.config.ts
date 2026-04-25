import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for BITS frontend.
 *
 * Notes:
 *  - We only auto-start the Vite dev server. The backend (port 3000) must be
 *    started separately via `npm run dev` in bits-backend before running specs.
 *  - The auth fixture in e2e/fixtures/auth.ts logs in once per role and reuses
 *    the storage state across tests.
 *  - Reports go to playwright-report/, traces to test-results/.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
