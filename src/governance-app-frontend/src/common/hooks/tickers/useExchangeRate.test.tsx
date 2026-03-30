import { describe, expect, it } from 'vitest';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';

import { parseExchangeRateResponse } from './useExchangeRate';

describe('parseExchangeRateResponse', () => {
  it('Parses a valid exchange rate response.', () => {
    const result = parseExchangeRateResponse({
      current: [
        {
          rate_e8s: 227_079_136n,
          timestamp_seconds: 1_774_870_800n,
          updated_at_seconds: 1_774_870_850n,
        },
      ],
      one_day_ago: [
        {
          rate_e8s: 222_988_450n,
          timestamp_seconds: 1_774_784_400n,
          updated_at_seconds: 1_774_870_864n,
        },
      ],
    });

    expect(result.size).toBe(1);
    expect(result.get(CANISTER_ID_ICP_LEDGER!)).toEqual({
      _name: 'ICP',
      icp: 1,
      usd: 2.27079136,
    });
  });

  it('Throws when current rate is missing.', () => {
    expect(() =>
      parseExchangeRateResponse({
        current: [],
        one_day_ago: [],
      }),
    ).toThrow('No current exchange rate available');
  });

  it('Throws when rate is zero.', () => {
    expect(() =>
      parseExchangeRateResponse({
        current: [
          {
            rate_e8s: 0n,
            timestamp_seconds: 1_774_870_800n,
            updated_at_seconds: 1_774_870_850n,
          },
        ],
        one_day_ago: [],
      }),
    ).toThrow('Invalid exchange rate');
  });
});
