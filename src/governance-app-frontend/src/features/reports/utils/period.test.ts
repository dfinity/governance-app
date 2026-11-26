import { describe, expect, it } from 'vitest';

import { getReportRange, isCustomRangeTooLong, ReportPeriod, toIsoDate } from './period';

const NOW = Date.UTC(2026, 10, 15, 12, 30);

describe('getReportRange', () => {
  it('gives the current UTC year up to now for year to date', () => {
    expect(getReportRange({ period: ReportPeriod.YearToDate, now: NOW })).toEqual({
      fromMs: Date.UTC(2026, 0, 1),
      toMs: NOW,
    });
  });

  it('gives the full previous UTC year for last year', () => {
    expect(getReportRange({ period: ReportPeriod.LastYear, now: NOW })).toEqual({
      fromMs: Date.UTC(2025, 0, 1),
      toMs: Date.UTC(2026, 0, 1),
    });
  });

  it('includes the full end date of a custom range', () => {
    expect(
      getReportRange({
        period: ReportPeriod.Custom,
        customFrom: '2025-07-01',
        customTo: '2025-12-31',
        now: NOW,
      }),
    ).toEqual({ fromMs: Date.UTC(2025, 6, 1), toMs: Date.UTC(2026, 0, 1) });
  });

  it('ends a custom range that includes today at now', () => {
    expect(
      getReportRange({
        period: ReportPeriod.Custom,
        customFrom: '2026-11-01',
        customTo: '2026-11-15',
        now: NOW,
      }),
    ).toEqual({ fromMs: Date.UTC(2026, 10, 1), toMs: NOW });
  });

  it.each([
    ['a missing date', '', '2026-01-01'],
    ['an invalid date', '2026-02-30', '2026-03-01'],
    ['an end before the start', '2026-03-02', '2026-03-01'],
    ['a start in the future', '2026-12-01', '2026-12-02'],
    ['an end in the future', '2026-11-01', '2026-11-16'],
  ])('rejects %s', (_, customFrom, customTo) => {
    expect(
      getReportRange({ period: ReportPeriod.Custom, customFrom, customTo, now: NOW }),
    ).toBeUndefined();
  });
});

describe('isCustomRangeTooLong', () => {
  it('accepts an end date one year after the start date', () => {
    const range = getReportRange({
      period: ReportPeriod.Custom,
      customFrom: '2025-01-15',
      customTo: '2026-01-15',
      now: NOW,
    });

    expect(range && isCustomRangeTooLong(range)).toBe(false);
  });

  it('rejects an end date more than one year after the start date', () => {
    const range = getReportRange({
      period: ReportPeriod.Custom,
      customFrom: '2025-01-15',
      customTo: '2026-01-16',
      now: NOW,
    });

    expect(range && isCustomRangeTooLong(range)).toBe(true);
  });
});

describe('toIsoDate', () => {
  it('gives the UTC date', () => {
    expect(toIsoDate(Date.UTC(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });
});
