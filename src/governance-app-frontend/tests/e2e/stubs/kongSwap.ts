import { Page } from '@playwright/test';

import { KONG_SWAP_URL } from '@constants/externalServices';
import { fixture_KongSwapTickers_Alice, fixture_KongSwapTickers_ckUSDC } from '@fixtures/kongSwap';

export const stubKongSwap = async (page: Page) => {
  await page.route(`${KONG_SWAP_URL}/coingecko/tickers`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([fixture_KongSwapTickers_Alice, fixture_KongSwapTickers_ckUSDC]),
    });
  });
};
