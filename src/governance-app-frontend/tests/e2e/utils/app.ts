import { expect, type Page } from '@playwright/test';

import { stubIcpSwap } from '../stubs/icpSwap';
import { stubKongSwap } from '../stubs/kongSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Stub external services with test data for consistent behavior.
  await stubIcpSwap(page);
  await stubKongSwap(page);

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Govern how the cloud evolves')).toBeVisible({
    timeout: 30000,
  });
};
