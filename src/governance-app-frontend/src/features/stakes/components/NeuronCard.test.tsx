import type { Neuron, NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { E8S } from '@constants/extra';

import { NeuronStandaloneAction } from './neuronDetail';
import { NeuronCard } from './NeuronCard';

// ─── Module mocks ────────────────────────────────────────────────

vi.mock('ic-use-internet-identity', () => ({
  useInternetIdentity: () => ({
    identity: {
      getPrincipal: () => ({ toText: () => 'controller-principal' }),
    },
  }),
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (keyOrFn: unknown, opts?: { returnObjects?: boolean }) => {
        if (typeof keyOrFn === 'function') {
          const result = (keyOrFn as (t: Record<string, unknown>) => unknown)(
            new Proxy(
              {},
              {
                get: (_target, prop: string) =>
                  new Proxy(
                    {},
                    {
                      get: (_t2, prop2: string) => `${prop}.${prop2}`,
                      [Symbol.toPrimitive]: () => `${prop}`,
                    },
                  ),
              },
            ),
          );
          if (opts?.returnObjects) return {};
          return result;
        }
        return keyOrFn;
      },
    }),
  };
});

vi.mock('@hooks/tickers/useTickerPrices', () => ({
  useTickerPrices: () => ({
    tickerPrices: { isLoading: false, data: undefined },
  }),
}));

vi.mock('@hooks/useApyColor', () => ({
  useApyColor: () => ({ ready: false }),
}));

vi.mock('@components/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// ─── Mock Factories ──────────────────────────────────────────────

const mockFullNeuron = (overrides: Partial<Neuron> = {}): Neuron => ({
  id: 1n,
  neuronType: undefined,
  stakedMaturityE8sEquivalent: 0n,
  controller: 'controller-principal',
  recentBallots: [],
  kycVerified: false,
  notForProfit: false,
  cachedNeuronStake: BigInt(10 * E8S),
  createdTimestampSeconds: 1_700_000_000n,
  autoStakeMaturity: undefined,
  maturityE8sEquivalent: 0n,
  agingSinceTimestampSeconds: 0n,
  spawnAtTimesSeconds: undefined,
  neuronFees: 0n,
  hotKeys: [],
  accountIdentifier: '',
  joinedCommunityFundTimestampSeconds: undefined,
  maturityDisbursementsInProgress: undefined,
  dissolveState: { DissolveDelaySeconds: 15_778_800n },
  followees: [{ topic: 4, followees: [{ id: 99n }] }],
  visibility: undefined,
  votingPowerRefreshedTimestampSeconds: undefined,
  potentialVotingPower: undefined,
  decidingVotingPower: undefined,
  ...overrides,
});

const mockNeuron = (
  overrides: Partial<Omit<NeuronInfo, 'fullNeuron'>> & {
    fullNeuron?: Partial<Neuron> | undefined;
  } = {},
): NeuronInfo => {
  const { fullNeuron, ...rest } = overrides;
  return {
    neuronId: 12345678901234n,
    state: NeuronState.Locked,
    dissolveDelaySeconds: 15_778_800n,
    createdTimestampSeconds: 1_700_000_000n,
    recentBallots: [],
    neuronType: undefined,
    joinedCommunityFundTimestampSeconds: undefined,
    retrievedAtTimestampSeconds: 0n,
    votingPower: 0n,
    votingPowerRefreshedTimestampSeconds: undefined,
    decidingVotingPower: undefined,
    potentialVotingPower: undefined,
    ageSeconds: 0n,
    visibility: undefined,
    fullNeuron:
      'fullNeuron' in overrides && isNullish(fullNeuron) ? undefined : mockFullNeuron(fullNeuron ?? {}),
    ...rest,
  };
};

// ─── Helpers ─────────────────────────────────────────────────────

const queryTestId = (id: string) => screen.queryByTestId(id);
const getTestId = (id: string) => screen.getByTestId(id);

// ─── Tests ───────────────────────────────────────────────────────

describe('NeuronCard', () => {
  // ─── Maturity mode ───────────────────────────────────────────

  it('shows "keep liquid" when auto-stake maturity is off', () => {
    render(<NeuronCard neuron={mockNeuron({ fullNeuron: { autoStakeMaturity: false } })} />);

    expect(getTestId('neuron-card-maturity-mode').textContent).toContain('neuron.keepLiquid');
  });

  it('shows "auto stake" when auto-stake maturity is on', () => {
    render(<NeuronCard neuron={mockNeuron({ fullNeuron: { autoStakeMaturity: true } })} />);

    expect(getTestId('neuron-card-maturity-mode').textContent).toContain('neuron.autoStake');
  });

  // ─── No-following warning ────────────────────────────────────

  it('shows no-following warning when neuron has no followees', () => {
    render(<NeuronCard neuron={mockNeuron({ fullNeuron: { followees: [] } })} />);

    expect(queryTestId('neuron-card-no-following-warning')).not.toBeNull();
  });

  it('hides no-following warning when neuron has followees', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          fullNeuron: { followees: [{ topic: 4, followees: [{ id: 99n }] }] },
        })}
      />,
    );

    expect(queryTestId('neuron-card-no-following-warning')).toBeNull();
  });

  // ─── Hotkey badge ────────────────────────────────────────────

  it('shows hotkey badge when user is a hotkey', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          fullNeuron: { controller: 'other-principal', hotKeys: ['controller-principal'] },
        })}
      />,
    );

    expect(queryTestId('neuron-hotkey-badge')).not.toBeNull();
  });

  it('hides hotkey badge when user is the controller', () => {
    render(<NeuronCard neuron={mockNeuron()} />);

    expect(queryTestId('neuron-hotkey-badge')).toBeNull();
  });

  // ─── Disburse ICP button ─────────────────────────────────────

  it('shows disburse ICP button when dissolved and has stake', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Dissolved,
          fullNeuron: { cachedNeuronStake: BigInt(5 * E8S) },
        })}
      />,
    );

    expect(queryTestId('neuron-card-disburse-icp-btn')).not.toBeNull();
  });

  it('hides disburse ICP button when dissolved but has no stake', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Dissolved,
          fullNeuron: { cachedNeuronStake: 0n },
        })}
      />,
    );

    expect(queryTestId('neuron-card-disburse-icp-btn')).toBeNull();
  });

  it('hides disburse ICP button when neuron is not dissolved', () => {
    render(<NeuronCard neuron={mockNeuron({ state: NeuronState.Locked })} />);

    expect(queryTestId('neuron-card-disburse-icp-btn')).toBeNull();
  });

  it('calls onAction with DisburseIcp when disburse ICP button is clicked', async () => {
    const onAction = vi.fn();
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Dissolved,
          fullNeuron: { cachedNeuronStake: BigInt(5 * E8S) },
        })}
        onAction={onAction}
      />,
    );

    await userEvent.click(getTestId('neuron-card-disburse-icp-btn'));
    expect(onAction).toHaveBeenCalledWith(NeuronStandaloneAction.DisburseIcp);
  });

  // ─── Disburse Maturity button ────────────────────────────────

  it('shows disburse maturity button when neuron has unstaked maturity', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: BigInt(2 * E8S) } })}
      />,
    );

    expect(queryTestId('neuron-card-disburse-maturity-btn')).not.toBeNull();
  });

  it('hides disburse maturity button when neuron has no unstaked maturity', () => {
    render(
      <NeuronCard neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: 0n } })} />,
    );

    expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeNull();
  });

  it('calls onAction with DisburseMaturity when clicked', async () => {
    const onAction = vi.fn();
    render(
      <NeuronCard
        neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: BigInt(2 * E8S) } })}
        onAction={onAction}
      />,
    );

    await userEvent.click(getTestId('neuron-card-disburse-maturity-btn'));
    expect(onAction).toHaveBeenCalledWith(NeuronStandaloneAction.DisburseMaturity);
  });

  // ─── Stake Maturity button ───────────────────────────────────

  it('shows stake maturity button when has unstaked maturity and not dissolved', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Locked,
          fullNeuron: { maturityE8sEquivalent: BigInt(2 * E8S) },
        })}
      />,
    );

    expect(queryTestId('neuron-card-stake-maturity-btn')).not.toBeNull();
  });

  it('hides stake maturity button when neuron is dissolved', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Dissolved,
          fullNeuron: {
            maturityE8sEquivalent: BigInt(2 * E8S),
            cachedNeuronStake: BigInt(5 * E8S),
          },
        })}
      />,
    );

    expect(queryTestId('neuron-card-stake-maturity-btn')).toBeNull();
  });

  it('calls onAction with StakeMaturity when clicked', async () => {
    const onAction = vi.fn();
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Locked,
          fullNeuron: { maturityE8sEquivalent: BigInt(2 * E8S) },
        })}
        onAction={onAction}
      />,
    );

    await userEvent.click(getTestId('neuron-card-stake-maturity-btn'));
    expect(onAction).toHaveBeenCalledWith(NeuronStandaloneAction.StakeMaturity);
  });

  // ─── Hotkey hides footer actions ─────────────────────────────

  it('hides all action buttons when user is a hotkey', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Dissolved,
          fullNeuron: {
            cachedNeuronStake: BigInt(5 * E8S),
            maturityE8sEquivalent: BigInt(2 * E8S),
            controller: 'other-principal',
            hotKeys: ['controller-principal'],
          },
        })}
      />,
    );

    expect(queryTestId('neuron-card-disburse-icp-btn')).toBeNull();
    expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeNull();
    expect(queryTestId('neuron-card-stake-maturity-btn')).toBeNull();
  });

  // ─── No footer when nothing to disburse ──────────────────────

  it('hides footer entirely when locked neuron has no maturity', () => {
    render(
      <NeuronCard
        neuron={mockNeuron({
          state: NeuronState.Locked,
          fullNeuron: { maturityE8sEquivalent: 0n },
        })}
      />,
    );

    expect(queryTestId('neuron-card-disburse-icp-btn')).toBeNull();
    expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeNull();
    expect(queryTestId('neuron-card-stake-maturity-btn')).toBeNull();
  });
});
