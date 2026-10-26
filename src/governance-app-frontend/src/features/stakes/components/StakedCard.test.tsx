import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { ForecastPeriod } from '@constants/forecast';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { MaturityEstimatePeriod } from '@utils/staking-rewards';

import { StakedCard } from './StakedCard';

const forecast = vi.hoisted(() => ({ period: 'year', setForecastPeriod: vi.fn() }));

vi.mock('@hooks/useForecastPeriod', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/useForecastPeriod')>()),
  useForecastPeriod: () => ({
    forecastPeriod: forecast.period,
    setForecastPeriod: forecast.setForecastPeriod,
  }),
}));

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock('@hooks/governance', () => ({
  useGovernanceNeurons: () => ({ data: { response: [] }, isLoading: false }),
}));

vi.mock('@hooks/icpLedger', () => ({
  useIcpLedgerAccountBalance: () => ({ data: { response: 0n }, isLoading: false }),
}));

vi.mock('@hooks/tickers', () => ({
  useIcpPrice: () => ({ icpPrice: 2.62, formatFiat: String, isLoading: false }),
}));

vi.mock('@hooks/useApyColor', () => ({ useApyColor: () => ({ ready: false }) }));

vi.mock('@hooks/useStakingRewards', () => ({
  useStakingRewards: () => ({
    loading: false,
    apy: { cur: 0.07, max: 0.07 },
    rewardEstimates: new Map([
      [MaturityEstimatePeriod.WEEK, 0.0145],
      [MaturityEstimatePeriod.MONTH, 1.86],
      [MaturityEstimatePeriod.YEAR, 22.68],
    ]),
    stakingFlowApyPreview: {
      [ICP_MAX_DISSOLVE_DELAY_SECONDS]: { autoStake: { locked: 0.14 } },
    },
  }),
}));

describe('StakedCard', () => {
  beforeEach(() => {
    forecast.period = ForecastPeriod.Year;
    forecast.setForecastPeriod.mockReset();
    vi.mocked(analytics.event).mockReset();
  });

  it('shows the forecast for the period that the user picked', () => {
    forecast.period = ForecastPeriod.Week;
    render(<StakedCard />);

    expect(
      screen.getByRole('button', { name: '1w forecast. Change the forecast period' }),
    ).toBeTruthy();
    expect(screen.getAllByText('+0.0145').length).toBeGreaterThan(0);
  });

  it('changes to the next period on a tap and tracks it', () => {
    render(<StakedCard />);

    fireEvent.click(
      screen.getByRole('button', { name: '1y forecast. Change the forecast period' }),
    );

    expect(forecast.setForecastPeriod).toHaveBeenCalledWith(ForecastPeriod.Week);
    expect(analytics.event).toHaveBeenCalledWith(AnalyticsEvent.ForecastPeriodChange, {
      period: ForecastPeriod.Week,
      source: 'overview',
    });
  });
});
