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

  // Navigate and wait for basic page load
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait directly for the main app content (React will hydrate when ready)
  // Using a very generous timeout for container environments
  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 90000,
  });
};
