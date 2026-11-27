import type { DailyRate } from '@declarations/governance-app-backend/backend.did';

import { E8Sn, SECONDS_IN_DAY } from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';

import type { ReportRange } from './period';

const MS_IN_DAY = SECONDS_IN_DAY * 1_000;

/**
 * If a day has no rate, the report uses the rate of the nearest earlier day, at most this many
 * days back. Forex markets close on weekends.
 */
export const MAX_RATE_LOOKBACK_DAYS = 7;

/** The ICP price of one UTC day, in the fiat currency of the report. */
export type ReportRate = {
  /** 00:00 UTC of the day of the ICP/USD rate. It can be before the day of the transaction. */
  dayMs: number;
  /**
   * 00:00 UTC of the day of the USD/fiat rate. It can be before `dayMs` if the day has no USD/fiat
   * rate. For USD, it is `dayMs`.
   */
  fiatDayMs: number;
  /** `false` if the backend can still change the USD/fiat rate. Always `true` for USD. */
  fiatIsFinal: boolean;
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

/** The rate of the day, or of the nearest earlier day within the lookback. */
const findRate = <Rate>(
  ratesByDayMs: Map<number, Rate>,
  dayMs: number,
): { dayMs: number; rate: Rate } | undefined => {
  for (let daysBack = 0; daysBack <= MAX_RATE_LOOKBACK_DAYS; daysBack++) {
    const rateDayMs = dayMs - daysBack * MS_IN_DAY;
    const rate = ratesByDayMs.get(rateDayMs);
    if (rate !== undefined) return { dayMs: rateDayMs, rate };
  }

  return undefined;
};

/**
 * Gives the ICP price of the UTC day of a timestamp. The ICP/USD rate and the USD/fiat rate each
 * come from the nearest day that has one. ICP moves much more than forex, so a recent day keeps
 * its own ICP/USD rate while its USD/fiat rate is not stored yet.
 */
export const createReportRateLookup = ({
  rates,
  currency,
}: {
  rates: DailyRate[];
  currency: FiatCurrency;
}): ReportRateLookup => {
  const isUsd = currency === FiatCurrency.USD;
  const icpToUsdByDayMs = new Map<number, bigint>();
  const usdToFiatByDayMs = new Map<number, { rateE8s: bigint; isFinal: boolean }>();

  for (const {
    timestamp_seconds,
    icp_to_usd_e8s,
    usd_to_fiat_e8s,
    usd_to_fiat_is_final,
  } of rates) {
    const dayMs = Number(timestamp_seconds) * 1_000;
    const [icpToUsdE8s] = icp_to_usd_e8s;
    const [usdToFiatE8s] = usd_to_fiat_e8s;
    if (icpToUsdE8s !== undefined) icpToUsdByDayMs.set(dayMs, icpToUsdE8s);
    if (usdToFiatE8s !== undefined) {
      usdToFiatByDayMs.set(dayMs, { rateE8s: usdToFiatE8s, isFinal: usd_to_fiat_is_final });
    }
  }

  return (timestampMs) => {
    const dayMs = startOfUtcDayMs(timestampMs);
    const icpToUsd = findRate(icpToUsdByDayMs, dayMs);
    if (icpToUsd === undefined) return undefined;

    const usdToFiat = isUsd
      ? { dayMs: icpToUsd.dayMs, rate: { rateE8s: E8Sn, isFinal: true } }
      : findRate(usdToFiatByDayMs, dayMs);
    if (usdToFiat === undefined) return undefined;

    return {
      dayMs: icpToUsd.dayMs,
      fiatDayMs: usdToFiat.dayMs,
      fiatIsFinal: usdToFiat.rate.isFinal,
      icpToFiatE8s: (icpToUsd.rate * usdToFiat.rate.rateE8s) / E8Sn,
    };
  };
};

/** The XRC can change the USD/fiat rate of a day until 00:00 UTC, this many days after the day. */
export const FIAT_RATE_FINAL_AFTER_DAYS = 3;

/**
 * 00:00 UTC of the day when all the given USD/fiat rates are final, or `undefined` if they are
 * final now. The newest day with a non-final rate gives the date.
 */
export const getFiatRatesFinalAtMs = (rates: (ReportRate | undefined)[]): number | undefined => {
  let newestNonFinalDayMs: number | undefined;
  for (const rate of rates) {
    if (rate === undefined || rate.fiatIsFinal) continue;
    newestNonFinalDayMs = Math.max(newestNonFinalDayMs ?? rate.fiatDayMs, rate.fiatDayMs);
  }

  return newestNonFinalDayMs === undefined
    ? undefined
    : newestNonFinalDayMs + FIAT_RATE_FINAL_AFTER_DAYS * MS_IN_DAY;
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
