import '@/i18n/config';

import { NeuronState } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E8Sn } from '@constants/extra';
import { ForecastPeriod } from '@constants/forecast';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { MaturityEstimatePeriod } from '@utils/staking-rewards';
import { mockNeuron } from '@fixtures/neuron';

import { EarningsCard } from './EarningsCard';

const USER = 'user-principal';
const DEVICE = 'device-principal';

const { ledgerPrincipals } = vi.hoisted(() => ({ ledgerPrincipals: vi.fn(() => [] as string[]) }));

vi.mock('@features/stakes/hooks/useNeuronSigner', () => ({
  useLedgerSignerPrincipals: () => ledgerPrincipals(),
}));

const forecast = vi.hoisted(() => ({ period: 'year' }));

vi.mock('@hooks/useForecastPeriod', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/useForecastPeriod')>()),
  useForecastPeriod: () => ({ forecastPeriod: forecast.period, setForecastPeriod: vi.fn() }),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => USER }) },
  }),
}));

vi.mock('@hooks/useStakingRewards', () => ({
  useStakingRewards: () => ({
    loading: false,
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
  beforeEach(() => {
    forecast.period = ForecastPeriod.Year;
  });

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

  it('shows the forecast for the period that the user picked', () => {
    forecast.period = ForecastPeriod.Month;
    render(<EarningsCard neurons={[optimizedNeuron()]} />);

    expect(screen.getByText('+1.86 per month')).toBeTruthy();
  });

  it('keeps three significant digits of a small weekly forecast', () => {
    forecast.period = ForecastPeriod.Week;
    render(<EarningsCard neurons={[optimizedNeuron()]} />);

    expect(screen.getByText('+0.0145 per week')).toBeTruthy();
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

  it('keeps a neuron that a usable Ledger device controls in the check', () => {
    ledgerPrincipals.mockReturnValue([DEVICE]);
    render(
      <EarningsCard
        neurons={[
          optimizedNeuron(),
          mockNeuron({ neuronId: 2n, fullNeuron: { controller: DEVICE, hotKeys: [USER] } }),
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Increase' })).toBeTruthy();
  });
});
