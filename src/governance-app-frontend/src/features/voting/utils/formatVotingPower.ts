import { formatNumber } from '@common/utils/numbers';

/**
 * Prettifies a voting power number into a human-readable string with appropriate units (K, M).
 * @param amount a positive number
 * @returns a string with a prettify representation of the voting power
 */
export const formatVotingPower = (amount: number): string => {
  if (amount >= 100_000_000) {
    // Hundreds of millions -> 192M (0 decimals)
    return `${formatNumber(amount / 1_000_000, { minFraction: 0, maxFraction: 0 })}M`;
  }
  if (amount >= 1_000_000) {
    // Tens of millions -> 1.1M or 20.1M (1 decimal)
    return `${formatNumber(amount / 1_000_000, { minFraction: 0, maxFraction: 1 })}M`;
  }
  if (amount >= 100_000) {
    // Hundreds of Thousands -> 931K (0 decimals)
    return `${formatNumber(amount / 1_000, { minFraction: 0, maxFraction: 0 })}K`;
  }
  if (amount >= 1_000) {
    // Thousands and Tens of thousands -> 1.1K or 99.2K (1 decimal)
    return `${formatNumber(amount / 1_000, { minFraction: 0, maxFraction: 1 })}K`;
  }

  // Rest the whole amount -> formatted with separators
  return formatNumber(amount, { minFraction: 0, maxFraction: 0 });
};
