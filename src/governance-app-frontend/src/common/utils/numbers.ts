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
