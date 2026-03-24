import type { Neuron } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { E8S } from '@constants/extra';
import { mockNeuron as baseMockNeuron } from '@fixtures/neuron';

import { NeuronCard } from './NeuronCard';
import { NeuronStandaloneAction } from './neuronDetail';

// ─── Module mocks ────────────────────────────────────────────────

const CONTROLLER = 'controller-principal';

vi.mock('ic-use-internet-identity', () => ({
  useInternetIdentity: () => ({
    identity: {
      getPrincipal: () => ({ toText: () => CONTROLLER }),
    },
  }),
}));

vi.mock('@hooks/tickers/useTickerPrices', () => ({
  useTickerPrices: () => ({
    tickerPrices: { isLoading: false, data: undefined },
  }),
}));

vi.mock('@hooks/useApyColor', () => ({
  useApyColor: () => ({ ready: false }),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const NEURON_DEFAULTS: Parameters<typeof baseMockNeuron>[0] = {
  dissolveDelaySeconds: 15_778_800n,
  createdTimestampSeconds: 1_700_000_000n,
  fullNeuron: {
    controller: CONTROLLER,
    cachedNeuronStake: BigInt(10 * E8S),
    createdTimestampSeconds: 1_700_000_000n,
    dissolveState: { DissolveDelaySeconds: 15_778_800n },
    followees: [{ topic: 4, followees: [{ id: 99n }] }],
  },
};

const mockNeuron = (overrides: Parameters<typeof baseMockNeuron>[0] = {}) => {
  const { fullNeuron: defaultFull, ...defaultTop } = NEURON_DEFAULTS;
  const { fullNeuron: overrideFull, ...overrideTop } = overrides;
  return baseMockNeuron({
    ...defaultTop,
    ...overrideTop,
    fullNeuron: { ...defaultFull, ...overrideFull } as Partial<Neuron>,
  });
};

const queryTestId = (id: string) => screen.queryByTestId(id);
const getTestId = (id: string) => screen.getByTestId(id);

describe('NeuronCard', () => {
  describe('maturity mode', () => {
    it('shows "keep liquid" when auto-stake maturity is off', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { autoStakeMaturity: false } })} />);

      expect(getTestId('neuron-card-maturity-mode').textContent).toContain('neuron.keepLiquid');
    });

    it('shows "auto stake" when auto-stake maturity is on', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { autoStakeMaturity: true } })} />);

      expect(getTestId('neuron-card-maturity-mode').textContent).toContain('neuron.autoStake');
    });
  });

  describe('no-following warning', () => {
    it('shows warning when neuron has no followees', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { followees: [] } })} />);

      expect(queryTestId('neuron-card-no-following-warning')).not.toBeNull();
    });

    it('hides warning when neuron has followees', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({
            fullNeuron: { followees: [{ topic: 4, followees: [{ id: 99n }] }] },
          })}
        />,
      );

      expect(queryTestId('neuron-card-no-following-warning')).toBeNull();
    });
  });

  describe('hotkey badge', () => {
    it('shows badge when user is a hotkey', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({
            fullNeuron: { controller: 'other-principal', hotKeys: ['controller-principal'] },
          })}
        />,
      );

      expect(queryTestId('neuron-hotkey-badge')).not.toBeNull();
    });

    it('hides badge when user is the controller', () => {
      render(<NeuronCard neuron={mockNeuron()} />);

      expect(queryTestId('neuron-hotkey-badge')).toBeNull();
    });
  });

  describe('disburse ICP button', () => {
    it('shows when dissolved and has stake', () => {
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

    it('hides when dissolved but has no stake', () => {
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

    it('hides when neuron is not dissolved', () => {
      render(<NeuronCard neuron={mockNeuron({ state: NeuronState.Locked })} />);

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeNull();
    });

    it('hides when stake is fully consumed by fees', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({
            state: NeuronState.Dissolved,
            fullNeuron: { cachedNeuronStake: BigInt(1 * E8S), neuronFees: BigInt(1 * E8S) },
          })}
        />,
      );

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeNull();
    });

    it('calls onAction with DisburseIcp when clicked', async () => {
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
  });

  describe('disburse maturity button', () => {
    it('shows when neuron has unstaked maturity', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: BigInt(2 * E8S) } })}
        />,
      );

      expect(queryTestId('neuron-card-disburse-maturity-btn')).not.toBeNull();
    });

    it('hides when neuron has no unstaked maturity', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: 0n } })} />);

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
  });

  describe('stake maturity button', () => {
    it('shows when has unstaked maturity and not dissolved', () => {
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

    it('hides when neuron is dissolved', () => {
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
  });

  describe('hotkey restrictions', () => {
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
  });

  describe('footer visibility', () => {
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
});
