import { describe, expect, it } from 'vitest';

import type { DailyRate } from '@declarations/governance-app-backend/backend.did';

import { FiatCurrency } from '@constants/fiat';

import {
  createReportRateLookup,
  getRateRange,
  MAX_RATE_LOOKBACK_DAYS,
  toFiatHundredths,
  toFiatSymbolParam,
} from './rates';

const DAY_MS = 86_400_000;
const JAN_1 = Date.UTC(2026, 0, 1);

const rate = (dayMs: number, { icp, fiat }: { icp?: bigint; fiat?: bigint }): DailyRate => ({
  timestamp_seconds: BigInt(dayMs / 1_000),
  icp_to_usd_e8s: icp === undefined ? [] : [icp],
  usd_to_fiat_e8s: fiat === undefined ? [] : [fiat],
});

describe('createReportRateLookup', () => {
  it('multiplies the ICP/USD and USD/fiat rates of the day of the timestamp', () => {
    const lookup = createReportRateLookup({
      rates: [rate(JAN_1, { icp: 300_000_000n, fiat: 90_000_000n })],
      currency: FiatCurrency.EUR,
    });

    expect(lookup(JAN_1 + 15 * 3_600_000)).toEqual({
      dayMs: JAN_1,
      fiatDayMs: JAN_1,
      icpToFiatE8s: 270_000_000n,
    });
  });

  it('takes each rate from the nearest earlier day that has it', () => {
    const lookup = createReportRateLookup({
      rates: [
        rate(JAN_1, { icp: 300_000_000n, fiat: 90_000_000n }),
        rate(JAN_1 + DAY_MS, { icp: 310_000_000n }),
      ],
      currency: FiatCurrency.EUR,
    });

    expect(lookup(JAN_1 + 2 * DAY_MS)).toEqual({
      dayMs: JAN_1 + DAY_MS,
      fiatDayMs: JAN_1,
      icpToFiatE8s: 279_000_000n,
    });
  });

  it('gives no price without a USD/fiat rate in the lookback', () => {
    const lookup = createReportRateLookup({
      rates: [
        rate(JAN_1, { fiat: 90_000_000n }),
        rate(JAN_1 + (MAX_RATE_LOOKBACK_DAYS + 1) * DAY_MS, { icp: 300_000_000n }),
      ],
      currency: FiatCurrency.EUR,
    });

    expect(lookup(JAN_1 + (MAX_RATE_LOOKBACK_DAYS + 1) * DAY_MS)).toBeUndefined();
  });

  it('needs no fiat rate for USD', () => {
    const lookup = createReportRateLookup({
      rates: [rate(JAN_1, { icp: 300_000_000n })],
      currency: FiatCurrency.USD,
    });

    expect(lookup(JAN_1)).toEqual({
      dayMs: JAN_1,
      fiatDayMs: JAN_1,
      icpToFiatE8s: 300_000_000n,
    });
  });

  it(`looks back at most ${MAX_RATE_LOOKBACK_DAYS} days`, () => {
    const lookup = createReportRateLookup({
      rates: [rate(JAN_1, { icp: 300_000_000n })],
      currency: FiatCurrency.USD,
    });

    expect(lookup(JAN_1 + MAX_RATE_LOOKBACK_DAYS * DAY_MS)?.dayMs).toBe(JAN_1);
    expect(lookup(JAN_1 + (MAX_RATE_LOOKBACK_DAYS + 1) * DAY_MS)).toBeUndefined();
    expect(lookup(JAN_1 - 1)).toBeUndefined();
  });
});

describe('getRateRange', () => {
  it('starts at 00:00 UTC, the lookback days before the range', () => {
    expect(getRateRange({ fromMs: JAN_1 + 3_600_000, toMs: JAN_1 + 10 * DAY_MS })).toEqual({
      fromMs: JAN_1 - MAX_RATE_LOOKBACK_DAYS * DAY_MS,
      toMs: JAN_1 + 10 * DAY_MS,
    });
  });
});

describe('toFiatSymbolParam', () => {
  it('sends no symbol for USD', () => {
    expect(toFiatSymbolParam(FiatCurrency.USD)).toEqual([]);
    expect(toFiatSymbolParam(FiatCurrency.CHF)).toEqual(['CHF']);
  });
});

describe('toFiatHundredths', () => {
  it('rounds half away from zero', () => {
    expect(toFiatHundredths({ amountE8s: 150_000_000n, icpToFiatE8s: 264_000_000n })).toBe(396n);
    expect(toFiatHundredths({ amountE8s: 500_000n, icpToFiatE8s: 100_000_000n })).toBe(1n);
    expect(toFiatHundredths({ amountE8s: -500_000n, icpToFiatE8s: 100_000_000n })).toBe(-1n);
    expect(toFiatHundredths({ amountE8s: 499_999n, icpToFiatE8s: 100_000_000n })).toBe(0n);
  });
});
