import { Cbor } from '@icp-sdk/core/agent';
import { IDL } from '@icp-sdk/core/candid';
import type { Page } from '@playwright/test';

import { CANISTER_ID_SELF } from '@constants/canisterIds';
import { fixture_ExchangeRate } from '@fixtures/exchangeRate';

const CachedRate = IDL.Record({
  rate_e8s: IDL.Nat64,
  updated_at_seconds: IDL.Nat64,
  timestamp_seconds: IDL.Nat64,
});

const IcpExchangeRateResponseType = IDL.Record({
  current: IDL.Opt(CachedRate),
  one_day_ago: IDL.Opt(CachedRate),
});

const encodedResponse = Cbor.encode({
  status: 'replied',
  reply: {
    arg: IDL.encode([IcpExchangeRateResponseType], [fixture_ExchangeRate]),
  },
});

export const stubExchangeRate = async (page: Page) => {
  if (!CANISTER_ID_SELF) return;

  await page.route(`**/canister/${CANISTER_ID_SELF}/query`, async (route) => {
    const body = route.request().postDataBuffer();
    if (body?.toString('utf-8').includes('get_icp_to_usd_exchange_rate')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/cbor',
        body: Buffer.from(encodedResponse),
      });
    } else {
      await route.continue();
    }
  });
};
