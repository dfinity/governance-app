import { describe, expect, it } from 'vitest';

import { SECONDS_IN_DAY, SECONDS_IN_YEAR } from '@constants/extra';

import { formatDissolveDelay } from '@utils/neuron';

describe('formatDissolveDelay', () => {
  describe('strips the 365.25-day artifact for round year values', () => {
    it('strips 6h artifact for 1 year', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR) })).toBe('1 year');
    });

    it('strips 12h artifact for 2 years', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR * 2) })).toBe('2 years');
    });

    it('strips 18h artifact for 3 years', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR * 3) })).toBe('3 years');
    });

    it('needs no stripping for 4 years (365.25 × 4 is a whole number of days)', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR * 4) })).toBe('4 years');
    });
  });

  describe('preserves legitimate hours for dissolving neurons', () => {
    it('keeps hours when sub-day does not match artifact pattern', () => {
      const seconds = BigInt(SECONDS_IN_DAY + 3 * 3600); // 1 day + 3 hours
      expect(formatDissolveDelay({ seconds })).toBe('1 day, 3 hours');
    });

    it('keeps hours when dissolving from 2 years with time elapsed', () => {
      // 2 years minus 1 hour: sub-day = 11h, artifact for 1 year = 6h — no match
      const seconds = BigInt(SECONDS_IN_YEAR * 2) - 3600n;
      expect(formatDissolveDelay({ seconds })).toBe('2 years, 11 hours');
    });
  });

  it('returns empty string for 0 seconds', () => {
    expect(formatDissolveDelay({ seconds: 0n })).toBe('');
  });
});
