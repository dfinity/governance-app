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

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Earn by helping the network think')).toBeVisible({
    timeout: 30000,
  });
};
