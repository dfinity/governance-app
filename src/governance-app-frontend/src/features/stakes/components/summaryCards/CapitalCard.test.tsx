import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { E8Sn } from '@constants/extra';
import { mockNeuron } from '@fixtures/neuron';

import { CapitalCard } from './CapitalCard';

vi.mock('@hooks/tickers/useIcpPrice', () => ({
  useIcpPrice: () => ({ icpPrice: undefined, isLoading: false }),
}));

describe('CapitalCard', () => {
  it('shows the stake plus the staked maturity, without the free maturity', () => {
    const neuron = mockNeuron({
      fullNeuron: {
        cachedNeuronStake: 10n * E8Sn,
        stakedMaturityE8sEquivalent: 2n * E8Sn,
        maturityE8sEquivalent: 3n * E8Sn,
      },
    });

    render(<CapitalCard neurons={[neuron]} />);

    expect(screen.getByText('12.00 ICP')).toBeTruthy();
  });

  it('tells the user that the total includes staked maturity', () => {
    render(<CapitalCard neurons={[mockNeuron()]} />);

    expect(
      screen.getByRole('button', { name: 'Locked in neurons Includes staked maturity' }),
    ).toBeTruthy();
  });
});
