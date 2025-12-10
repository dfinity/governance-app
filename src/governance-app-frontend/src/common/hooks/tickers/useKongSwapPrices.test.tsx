import { describe, expect, it } from 'vitest';

import { CANISTER_ID_CKUSD_LEDGER, CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import {
  fixture_KongSwapTickers_Alice,
  fixture_KongSwapTickers_ckUSDC,
  fixture_KongSwapTickers_nonIcpBased,
} from '@fixtures/kongSwap';

import { parseKongSwapTickers } from './useKongSwapPrices';

describe('parseKongSwapTickers', () => {
  it('Parses KongSwap tickers correctly.', () => {
    const data = [fixture_KongSwapTickers_Alice];

    // Throw in case cdkUSDC ticker is missing.
    expect(() => parseKongSwapTickers(data)).toThrow();

    // Add ckUSDC ticker to calculate ICP price.
    data.push(fixture_KongSwapTickers_ckUSDC);
    let res = parseKongSwapTickers(data);
    expect(res.size).toBe(3); // ALICE, ckUSDC, ICP.
    expect(res.get(CANISTER_ID_CKUSD_LEDGER!)).toEqual({
      _name: 'N/A (KongSwap)',
      icp: 0.2996200817363583,
      usd: 1,
    });

    // Non-ICP based tickers are ignored.
    data.push(fixture_KongSwapTickers_nonIcpBased);
    res = parseKongSwapTickers(data);
    expect(res.size).toBe(3); // Still ALICE, ckUSDC, ICP.

    // The ICP ticker is always added.
    expect(res.get(CANISTER_ID_ICP_LEDGER!)).toEqual({
      _name: 'ICP',
      icp: 1,
      usd: 3.3375600000000003,
    });

    // Throw in case the ICP price is not a finite non-zero number.
    const invalidCkUSDC = { ...fixture_KongSwapTickers_ckUSDC, last_price: 0 };
    expect(() => parseKongSwapTickers([fixture_KongSwapTickers_Alice, invalidCkUSDC])).toThrow();
  });
});
