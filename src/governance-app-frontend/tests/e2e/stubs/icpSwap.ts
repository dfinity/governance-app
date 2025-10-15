import { Page } from '@playwright/test';

import { ICP_SWAP_URL } from '@constants/externalServices';
import { fixture_IcpSwapTickers_Alice, fixture_IcpSwapTickers_ckUSDC } from '@fixtures/icpSwap';

export const stubIcpSwap = async (page: Page) => {
  await page.route(`${ICP_SWAP_URL}/tickers`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([...fixture_IcpSwapTickers_Alice, fixture_IcpSwapTickers_ckUSDC]),
    });
  });
};
