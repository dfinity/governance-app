import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/IcpSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Stub external services with test data for consistent behavior.
  await stubIcpSwap(page);

  await page.goto(url);
  await page.waitForLoadState('networkidle'); // ensures all assets loaded
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });
};
