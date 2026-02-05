import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Stub external services with test data for consistent behavior.
  await stubIcpSwap(page);
  await stubKongSwap(page);

  // Set e2e flag to disable TanStack Query retries.
  await page.addInitScript(() => {
    window.isPlaywright = true;
  });

  // Use 'load' instead of domcontentloaded - waits for stylesheets/images but not network idle
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  // Wait for React app to hydrate and render
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 30000,
  });
};
