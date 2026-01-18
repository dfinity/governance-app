import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from the root .env file
dotenv.config({ path: '../../.env' });

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: './tests/e2e/snapshots/{testFilePath}-{arg}-{projectName}-{platform}{ext}',
  /* Test timeout - increased for blockchain transactions */
  timeout: 120000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'], // prints results to CI logs
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
