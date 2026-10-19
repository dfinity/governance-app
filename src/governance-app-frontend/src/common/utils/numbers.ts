import { nonNullish } from '@dfinity/utils';

import { E8S_PRECISION } from '@constants/extra';

export const isFiniteNonZeroNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value !== 0;

/**
 * Default format: 123456.789 -> "123'456.79"
 */
export const formatNumber = (
  value: number,
  options?: {
    minFraction: number;
    maxFraction: number;
    maximumSignificantDigits?: number;
  },
): string => {
  const { minFraction = 2, maxFraction = 2, maximumSignificantDigits } = options || {};

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
    ...(nonNullish(maximumSignificantDigits) && { maximumSignificantDigits }),
  })
    .format(value)
    .replace(/\s/g, '’')
    .replace(',', '.');
};

export type FormatFiatOptions = { minFraction: number; maxFraction: number };

/**
 * The number of decimals of the currency's smallest unit. For example, 2 for "EUR" and 0 for "JPY".
 */
export const getFiatFractionDigits = (currency: string): number =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;

/**
 * Default format: (1234.5, "EUR") -> "€1’234.50", (1234.5, "CHF") -> "CHF 1’234.50",
 * (1234.5, "JPY") -> "¥1’235"
 */
export const formatFiat = (
  value: number,
  currency: string,
  options?: FormatFiatOptions,
): string => {
  const fractionDigits = getFiatFractionDigits(currency);
  const { minFraction = fractionDigits, maxFraction = fractionDigits } = options || {};

  // The `en` locale puts the symbol before the number, for example "CA$" or "CHF ".
  const parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
  const symbol = parts
    .slice(
      0,
      parts.findIndex(({ type }) => type === 'integer'),
    )
    .map(({ value }) => value)
    .join('');

  return `${symbol}${formatNumber(value, { minFraction, maxFraction })}`;
};

/**
 * Default format: 168123456 -> "168.1M", 30000000 -> "30M", 950 -> "950"
 */
export const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/**
 * Default format: 0.150123 -> "15.01%"
 */
export const formatPercentage = (
  value: number,
  options?: { minFraction: number; maxFraction: number },
) => {
  const { minFraction = 2, maxFraction = 2 } = options || {};
  return `${formatNumber(value * 100, { minFraction, maxFraction })}%`;
};

/**
 * Rounds a number to E8S precision to avoid floating-point precision issues.
 */
export const roundToE8sPrecision = (value: number): number => {
  const factor = 10 ** E8S_PRECISION;
  return Math.round(value * factor) / factor;
};
