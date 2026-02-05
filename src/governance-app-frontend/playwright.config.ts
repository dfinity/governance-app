import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from the root .env file
dotenv.config({ path: '../../.env' });

const baseURL = 'http://uxrrr-q7777-77774-qaaaq-cai.localhost:8080';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: './tests/e2e/snapshots/{testFilePath}-{arg}-{projectName}-{platform}{ext}',
  /* Test timeout - 1.5 minute */
  timeout: 30000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 0 : 0,
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
      use: {
        ...devices['Desktop Chrome'],
        /* Browser launch args for container compatibility */
        launchOptions: {
          args: [
            '--disable-web-security', // Allow localhost cross-origin
            '--disable-setuid-sandbox', // Required for rootless containers
            '--no-sandbox', // Required for running as root in container
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-blink-features=AutomationControlled', // Avoid detection
            '--disable-popup-blocking', // Allow Internet Identity popup
          ],
        },
      },
    },
  ],
});
