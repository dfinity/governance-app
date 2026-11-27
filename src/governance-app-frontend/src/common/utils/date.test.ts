import { describe, expect, it } from 'vitest';

import { secondsToDate } from './date';

describe('secondsToDate', () => {
  it('gives the date in the time zone of the option', () => {
    const lateSeconds = Date.UTC(2026, 10, 18, 23, 30) / 1_000;
    const earlySeconds = Date.UTC(2026, 10, 19, 0, 30) / 1_000;

    expect(secondsToDate(lateSeconds, { timeZone: 'UTC' })).toBe('Nov 18, 2026');
    expect(secondsToDate(earlySeconds, { timeZone: 'UTC' })).toBe('Nov 19, 2026');
  });
});
