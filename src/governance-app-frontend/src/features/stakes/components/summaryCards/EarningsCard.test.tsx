import '@/i18n/config';

import { NeuronState } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { E8Sn } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { MaturityEstimatePeriod } from '@utils/staking-rewards';
import { mockNeuron } from '@fixtures/neuron';

import { EarningsCard } from './EarningsCard';

const USER = 'user-principal';

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => USER }) },
  }),
}));

vi.mock('@hooks/useStakingRewards', () => ({
  useStakingRewards: () => ({
    loading: false,
    rewardEstimates: new Map([[MaturityEstimatePeriod.YEAR, 22.68]]),
    stakingFlowApyPreview: {
      [ICP_MAX_DISSOLVE_DELAY_SECONDS]: { autoStake: { locked: 0.14 } },
    },
  }),
}));

vi.mock('@features/stakes/components/ApyOptimizationModal', () => ({
  ApyOptimizationModal: ({ trigger }: { trigger: ReactElement }) => trigger,
}));

const optimizedNeuron = (overrides: Parameters<typeof mockNeuron>[0] = {}) =>
  mockNeuron({
    state: NeuronState.Locked,
    dissolveDelaySeconds: BigInt(ICP_MAX_DISSOLVE_DELAY_SECONDS),
    fullNeuron: { autoStakeMaturity: true },
    ...overrides,
  });

describe('EarningsCard', () => {
  it('shows the locked plus the available maturity', () => {
    const neuron = mockNeuron({
      fullNeuron: {
        cachedNeuronStake: 10n * E8Sn,
        stakedMaturityE8sEquivalent: 2n * E8Sn,
        maturityE8sEquivalent: 3n * E8Sn,
      },
    });

    render(<EarningsCard neurons={[neuron]} />);

    expect(screen.getByText('5.00')).toBeTruthy();
  });

  it('shows the forecast for one year', () => {
    render(<EarningsCard neurons={[optimizedNeuron()]} />);

    expect(screen.getByText('+22.68 per year')).toBeTruthy();
  });

  it('offers a higher rate when a neuron is not optimized', () => {
    render(<EarningsCard neurons={[optimizedNeuron(), mockNeuron({ neuronId: 2n })]} />);

    expect(screen.getByRole('button', { name: 'Increase' })).toBeTruthy();
  });

  it('does not offer a higher rate when each neuron is optimized', () => {
    render(<EarningsCard neurons={[optimizedNeuron()]} />);

    expect(screen.queryByRole('button', { name: 'Increase' })).toBeNull();
  });

  it('leaves dissolved neurons out of the check', () => {
    render(
      <EarningsCard
        neurons={[optimizedNeuron(), mockNeuron({ neuronId: 2n, state: NeuronState.Dissolved })]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Increase' })).toBeNull();
  });

  it('leaves hotkey neurons out of the check', () => {
    render(
      <EarningsCard
        neurons={[
          optimizedNeuron(),
          mockNeuron({
            neuronId: 2n,
            fullNeuron: { controller: 'other-principal', hotKeys: [USER] },
          }),
        ]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Increase' })).toBeNull();
  });
});
