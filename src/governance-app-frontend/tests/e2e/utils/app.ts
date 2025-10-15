import { expect, type Page } from '@playwright/test';

import { ICP_SWAP_URL } from '@constants/externalServices';
import { fixture_IcpSwapTickers_Alice, fixture_IcpSwapTickers_ckUSDC } from '@fixtures/IcpSwap';

export const openApp = async ({ page, url = '/' }: { page: Page; url?: string }) => {
  // Stub ICP Swap API with test data for consistent screenshots.
  await page.route(`${ICP_SWAP_URL}/tickers`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([...fixture_IcpSwapTickers_Alice, fixture_IcpSwapTickers_ckUSDC]),
    });
  });

  await page.goto(url);
  await page.waitForLoadState('networkidle'); // ensures all assets loaded
  await expect(page.getByTestId('main-layout')).toBeVisible({ timeout: 15000 });
};
