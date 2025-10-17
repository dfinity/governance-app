import { describe, expect, it } from 'vitest';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import {
  fixture_IcpSwapTickers_Alice,
  fixture_IcpSwapTickers_ckUSDC,
  fixture_IcpSwapTickers_nonIcpBased,
} from '@fixtures/icpSwap';

import { parseIcpSwapTickers } from './useIcpSwapPrices';

describe('parseIcpSwapTickers', () => {
  it('Parses IcpSwap tickers correctly.', () => {
    const data = [...fixture_IcpSwapTickers_Alice];

    // Throw in case cdkUSDC ticker is missing.
    expect(() => parseIcpSwapTickers(data)).toThrow();

    // Pairs are grouped by base_id, and the one with the highest target_volume_24H is chosen.
    data.push(fixture_IcpSwapTickers_ckUSDC);
    let res = parseIcpSwapTickers(data);
    expect(res.size).toBe(3); // ALICE, ckUSDC, ICP.
    expect(res.get('oj6if-riaaa-aaaaq-aaeha-cai')?.name).toEqual('ALICE_ICP 3'); // Highest volume ticker for ALICE.

    // Non-ICP based tickers are ignored.
    data.push(fixture_IcpSwapTickers_nonIcpBased);
    res = parseIcpSwapTickers(data);
    expect(res.size).toBe(3); // Still ALICE, ckUSDC, ICP.

    // The ICP ticker is always added.
    expect(res.get(CANISTER_ID_ICP_LEDGER!)).toEqual({
      name: 'ICP',
      icp: 1,
      usd: 3.537176,
    });

    // Throw in case the ICP price is not a finite non-zero number.
    const invalidCkUSDC = { ...fixture_IcpSwapTickers_ckUSDC, last_price: '0' };
    expect(() => parseIcpSwapTickers([...fixture_IcpSwapTickers_Alice, invalidCkUSDC])).toThrow();
  });
});
