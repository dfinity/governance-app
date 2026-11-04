import '@/i18n/config';

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E8S } from '@constants/extra';

import { TotalStakedCard } from './TotalStakedCard';

const mocks = vi.hoisted(() => ({
  tvlValue: vi.fn(),
  governanceMetrics: vi.fn(),
}));

vi.mock('@hooks/useTvlValue', () => ({ useTvlValue: mocks.tvlValue }));

vi.mock('@hooks/governance', () => ({ useGovernanceMetrics: mocks.governanceMetrics }));

const METRICS = {
  totalSupplyIcp: 1_000n,
  totalLockedE8s: BigInt(436 * E8S),
  notDissolvingNeuronsE8sBuckets: [
    [1n, 56 * E8S],
    [4n, 300 * E8S],
  ],
  dissolvingNeuronsE8sBuckets: [[2n, 80 * E8S]],
};

const mockTvl = (tvl: number | undefined, isLoading = false) =>
  mocks.tvlValue.mockReturnValue({
    tvl,
    formatTvl: (value: number) => `$${value}`,
    isLoading,
  });

const mockMetrics = (response: typeof METRICS | undefined, isLoading = false) =>
  mocks.governanceMetrics.mockReturnValue({
    data: response ? { response, certified: true } : undefined,
    isLoading,
  });

describe('TotalStakedCard', () => {
  beforeEach(() => {
    mocks.tvlValue.mockReset();
    mocks.governanceMetrics.mockReset();
  });

  it('shows the share of the supply next to the value', () => {
    mockTvl(1_413);
    mockMetrics(METRICS);

    render(<TotalStakedCard />);

    expect(screen.getByText('43.6% of supply')).toBeTruthy();
  });

  it('shows the supply bar with a legend of each lock type', () => {
    mockTvl(1_413);
    mockMetrics(METRICS);

    render(<TotalStakedCard />);

    const bar = screen.getByTestId('locked-supply-bar');
    expect(bar.textContent).toBe(
      'Max 2-year lock: 300 ICP (30.0%). Shorter lock: 56 ICP (5.6%). Dissolving: 80 ICP (8.0%). Not locked: 564 ICP (56.4%). Total supply: 1K ICP.',
    );
    // The tooltip is mocked, so its content renders next to the bar.
    const legend = bar.nextElementSibling as HTMLElement;
    expect(within(legend).getByText('Max 2-year lock')).toBeTruthy();
    expect(within(legend).getByText('30.0%')).toBeTruthy();
    expect(within(legend).getByText('1K ICP')).toBeTruthy();
  });

  it('shows the share of the supply without a price', () => {
    mockTvl(undefined);
    mockMetrics(METRICS);

    render(<TotalStakedCard />);

    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('43.6% of supply')).toBeTruthy();
    expect(screen.getByTestId('locked-supply-bar')).toBeTruthy();
  });

  it('does not show the bar while the metrics load', () => {
    mockTvl(undefined, true);
    mockMetrics(undefined, true);

    render(<TotalStakedCard />);

    expect(screen.queryByText(/of supply/)).toBeNull();
    expect(screen.queryByTestId('locked-supply-bar')).toBeNull();
  });
});
