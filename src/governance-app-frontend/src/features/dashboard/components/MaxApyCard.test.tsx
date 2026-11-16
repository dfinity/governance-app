import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MaxApyCard } from './MaxApyCard';

const mocks = vi.hoisted(() => ({ maturityModulation: vi.fn() }));

vi.mock('@hooks/governance', () => ({
  useGovernanceMaturityModulation: mocks.maturityModulation,
}));
vi.mock('@hooks/useStakingRewards', () => ({
  useStakingRewards: () => ({ loading: true }),
}));

const mockModulation = (currentValuePermyriad: number | undefined, isLoading = false) =>
  mocks.maturityModulation.mockReturnValue({
    data: isLoading
      ? undefined
      : {
          certified: false,
          response: { currentValuePermyriad, updatedAtTimestampSeconds: 1_793_404_800n },
        },
    isLoading,
  });

describe('MaxApyCard', () => {
  beforeEach(() => {
    mocks.maturityModulation.mockReset();
  });

  it('shows the current maturity modulation with its rate in the tooltip', () => {
    mockModulation(-195);
    render(<MaxApyCard />);

    const line = screen.getByTestId('max-apy-maturity-modulation');
    expect(line.textContent).toContain('Maturity modulation −1.95%');
    expect(line.textContent).toContain('Today, 1 maturity converts to 0.9805 ICP.');
  });

  it('shows a plus sign for a positive modulation', () => {
    mockModulation(150);
    render(<MaxApyCard />);

    expect(screen.getByTestId('max-apy-maturity-modulation').textContent).toContain(
      'Maturity modulation +1.50%',
    );
  });

  it('hides the line when the modulation is unknown', () => {
    mockModulation(undefined);
    render(<MaxApyCard />);

    expect(screen.queryByTestId('max-apy-maturity-modulation')).toBeNull();
  });

  it('hides the line while the modulation loads', () => {
    mockModulation(undefined, true);
    render(<MaxApyCard />);

    expect(screen.queryByTestId('max-apy-maturity-modulation')).toBeNull();
  });
});
