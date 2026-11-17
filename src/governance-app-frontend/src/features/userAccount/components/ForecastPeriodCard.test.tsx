import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { ForecastPeriod } from '@constants/forecast';

import { ForecastPeriodCard } from './ForecastPeriodCard';

const state = vi.hoisted(() => ({ period: 'year', setForecastPeriod: vi.fn() }));
vi.mock('@hooks/useForecastPeriod', () => ({
  useForecastPeriod: () => ({
    forecastPeriod: state.period,
    setForecastPeriod: state.setForecastPeriod,
  }),
}));

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

describe('ForecastPeriodCard', () => {
  beforeEach(() => {
    state.period = ForecastPeriod.Year;
    state.setForecastPeriod.mockReset();
    vi.mocked(analytics.event).mockReset();
  });

  it('shows the stored period', () => {
    state.period = ForecastPeriod.Month;
    render(<ForecastPeriodCard />);

    const select = screen.getByRole('combobox', { name: 'Forecast period' }) as HTMLSelectElement;
    expect(select.value).toBe(ForecastPeriod.Month);
  });

  it('stores and tracks the period that the user picks', () => {
    render(<ForecastPeriodCard />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Forecast period' }), {
      target: { value: ForecastPeriod.Week },
    });

    expect(state.setForecastPeriod).toHaveBeenCalledWith(ForecastPeriod.Week);
    expect(analytics.event).toHaveBeenCalledWith(AnalyticsEvent.ForecastPeriodChange, {
      period: ForecastPeriod.Week,
      source: 'settings',
    });
  });
});
