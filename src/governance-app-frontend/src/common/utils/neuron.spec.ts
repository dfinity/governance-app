import { describe, expect, it } from 'vitest';

import { SECONDS_IN_DAY, SECONDS_IN_YEAR } from '@constants/extra';
import { formatDissolveDelay } from '@utils/neuron';

describe('formatDissolveDelay', () => {
  it('returns empty string for 0 seconds', () => {
    expect(formatDissolveDelay({ seconds: 0n })).toBe('');
  });

  describe('round year multiples show exact years', () => {
    it('returns "1 year" for 1 × SECONDS_IN_YEAR', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR) })).toBe('1 year');
    });

    it('returns "2 years" for 2 × SECONDS_IN_YEAR', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR * 2) })).toBe('2 years');
    });

    it('returns "3 years" for 3 × SECONDS_IN_YEAR', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR * 3) })).toBe('3 years');
    });

    it('returns "4 years" for 4 × SECONDS_IN_YEAR', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR * 4) })).toBe('4 years');
    });
  });

  describe('no upward jump when dissolving from a round year', () => {
    it('shows "1 year, 365 days" after 1h dissolving from 2 years', () => {
      const seconds = BigInt(SECONDS_IN_YEAR * 2) - 3600n;
      expect(formatDissolveDelay({ seconds })).toBe('1 year, 365 days');
    });

    it('shows "1 year, 365 days" after 6h dissolving from 2 years', () => {
      const seconds = BigInt(SECONDS_IN_YEAR * 2) - 6n * 3600n;
      expect(formatDissolveDelay({ seconds })).toBe('1 year, 365 days');
    });
  });

  describe('shows at most 2 most significant units', () => {
    it('drops hours when years and days are both present', () => {
      // 1 year + 2 days + 5 hours — hours dropped
      const seconds = BigInt(SECONDS_IN_YEAR) + BigInt(2 * SECONDS_IN_DAY) + 5n * 3600n;
      expect(formatDissolveDelay({ seconds })).toBe('1 year, 2 days');
    });

    it('drops minutes when days and hours are both present', () => {
      // 1 day, 3 hours, 30 minutes — minutes dropped
      const seconds = BigInt(SECONDS_IN_DAY + 3 * 3600 + 30 * 60);
      expect(formatDissolveDelay({ seconds })).toBe('1 day, 3 hours');
    });
  });

  describe('year boundary', () => {
    it('just below 1 year shows days and hours, not years', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR) - 1n })).toBe(
        '365 days, 5 hours',
      );
    });

    it('just above 1 year shows years and seconds', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_YEAR) + 1n })).toBe(
        '1 year, 1 second',
      );
    });
  });

  describe('singular forms', () => {
    it('returns "1 minute" for exactly 60 seconds', () => {
      expect(formatDissolveDelay({ seconds: 60n })).toBe('1 minute');
    });

    it('returns "1 second" for exactly 1 second', () => {
      expect(formatDissolveDelay({ seconds: 1n })).toBe('1 second');
    });

    it('returns "1 minute, 1 second" for 61 seconds', () => {
      expect(formatDissolveDelay({ seconds: 61n })).toBe('1 minute, 1 second');
    });
  });

  describe('2-week dissolve delay progression', () => {
    const TWO_WEEKS = BigInt(14 * SECONDS_IN_DAY);

    it('locked at 2 weeks shows "14 days"', () => {
      expect(formatDissolveDelay({ seconds: TWO_WEEKS })).toBe('14 days');
    });

    it('after 1h dissolving shows "13 days, 23 hours"', () => {
      expect(formatDissolveDelay({ seconds: TWO_WEEKS - 3600n })).toBe('13 days, 23 hours');
    });

    it('after 1 day dissolving shows "13 days"', () => {
      expect(formatDissolveDelay({ seconds: TWO_WEEKS - BigInt(SECONDS_IN_DAY) })).toBe('13 days');
    });

    it('with 1 day remaining shows "1 day"', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_DAY) })).toBe('1 day');
    });

    it('with 1 day and 1 hour remaining shows "1 day, 1 hour"', () => {
      expect(formatDissolveDelay({ seconds: BigInt(SECONDS_IN_DAY) + 3600n })).toBe(
        '1 day, 1 hour',
      );
    });

    it('with 1 hour remaining shows "1 hour"', () => {
      expect(formatDissolveDelay({ seconds: 3600n })).toBe('1 hour');
    });

    it('with 30 minutes remaining shows "30 minutes"', () => {
      expect(formatDissolveDelay({ seconds: 1800n })).toBe('30 minutes');
    });
  });
});
