import { describe, expect, it } from 'vitest';

import { ForecastPeriod } from '@constants/forecast';

import { getNextForecastPeriod } from './useForecastPeriod';

describe('getNextForecastPeriod', () => {
  it('Cycles from the year to the week, the month, and back to the year.', () => {
    expect(getNextForecastPeriod(ForecastPeriod.Year)).toBe(ForecastPeriod.Week);
    expect(getNextForecastPeriod(ForecastPeriod.Week)).toBe(ForecastPeriod.Month);
    expect(getNextForecastPeriod(ForecastPeriod.Month)).toBe(ForecastPeriod.Year);
  });
});
