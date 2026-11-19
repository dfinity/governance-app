import type { DailyRate } from '@declarations/governance-app-backend/backend.did';

import { E8Sn, SECONDS_IN_DAY } from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';

import type { ReportRange } from './period';

const MS_IN_DAY = SECONDS_IN_DAY * 1_000;

/**
 * If a day has no rate, the report uses the rate of the nearest earlier day, at most this many
 * days back. The backend fetches a fiat rate 3 days after its day, and forex markets close on
 * weekends.
 */
export const MAX_RATE_LOOKBACK_DAYS = 7;

/** The ICP price of one UTC day, in the fiat currency of the report. */
export type ReportRate = {
  /** 00:00 UTC of the day of the rate. It can be before the day of the transaction. */
  dayMs: number;
  icpToFiatE8s: bigint;
};

export type ReportRateLookup = (timestampMs: number) => ReportRate | undefined;

const startOfUtcDayMs = (timestampMs: number): number =>
  timestampMs - (((timestampMs % MS_IN_DAY) + MS_IN_DAY) % MS_IN_DAY);

/** The rates to load for a range: the range itself, plus the days that the lookback can use. */
export const getRateRange = ({ fromMs, toMs }: ReportRange): ReportRange => ({
  fromMs: startOfUtcDayMs(fromMs) - MAX_RATE_LOOKBACK_DAYS * MS_IN_DAY,
  toMs,
});

/** The `fiat_symbol` of the backend request. The backend has no USD/USD rate. */
export const toFiatSymbolParam = (currency: FiatCurrency): [] | [string] =>
  currency === FiatCurrency.USD ? [] : [currency];

/**
 * Gives the ICP price of the UTC day of a timestamp. A day counts only if it has both the ICP/USD
 * rate and, for a currency other than USD, the USD/fiat rate. Thus each price comes from one day.
 */
export const createReportRateLookup = ({
  rates,
  currency,
}: {
  rates: DailyRate[];
  currency: FiatCurrency;
}): ReportRateLookup => {
  const pricesByDayMs = new Map<number, bigint>();

  for (const { timestamp_seconds, icp_to_usd_e8s, usd_to_fiat_e8s } of rates) {
    const [icpToUsdE8s] = icp_to_usd_e8s;
    const [usdToFiatE8s] = currency === FiatCurrency.USD ? [E8Sn] : usd_to_fiat_e8s;
    if (icpToUsdE8s === undefined || usdToFiatE8s === undefined) continue;

    pricesByDayMs.set(Number(timestamp_seconds) * 1_000, (icpToUsdE8s * usdToFiatE8s) / E8Sn);
  }

  return (timestampMs) => {
    const dayMs = startOfUtcDayMs(timestampMs);

    for (let daysBack = 0; daysBack <= MAX_RATE_LOOKBACK_DAYS; daysBack++) {
      const rateDayMs = dayMs - daysBack * MS_IN_DAY;
      const icpToFiatE8s = pricesByDayMs.get(rateDayMs);
      if (icpToFiatE8s !== undefined) return { dayMs: rateDayMs, icpToFiatE8s };
    }

    return undefined;
  };
};

/**
 * The fiat value of an ICP amount in hundredths of the currency unit, rounded half away from
 * zero. For example, 1.5 ICP at 2.64 gives `396n` (3.96).
 */
export const toFiatHundredths = ({
  amountE8s,
  icpToFiatE8s,
}: {
  amountE8s: bigint;
  icpToFiatE8s: bigint;
}): bigint => {
  // e8s × e8s gives 16 decimals. Hundredths keep 2.
  const divisor = 10n ** 14n;
  const product = amountE8s * icpToFiatE8s;
  const half = divisor / 2n;

  return product < 0n ? -((-product + half) / divisor) : (product + half) / divisor;
};
