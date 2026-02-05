import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Stub external services with test data for consistent behavior.
  await stubIcpSwap(page);
  await stubKongSwap(page);

  // Listen for console errors to debug React hydration issues
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`Browser console error: ${msg.text()}`);
    }
  });

  // Set e2e flag to disable TanStack Query retries.
  await page.addInitScript(() => {
    window.isPlaywright = true;
  });

  // Use 'load' instead of domcontentloaded - waits for stylesheets/images but not network idle
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  // Wait for React to mount on #root element
  await page.waitForSelector('#root:has(*)', { timeout: 30000 });

  // Debug: log what's actually on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Page body text preview:', bodyText?.substring(0, 200));

  // Wait for React app to hydrate and render the main content
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 30000,
  });
};
