import type { Neuron } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountType } from '@features/accounts/types';

import { E8S } from '@constants/extra';
import { mockDisbursement, mockNeuron as baseMockNeuron } from '@fixtures/neuron';

import { NeuronCard } from './NeuronCard';
import { NeuronStandaloneAction } from './neuronDetail';

// ─── Module mocks ────────────────────────────────────────────────

const CONTROLLER = 'controller-principal';
const DEVICE_PRINCIPAL = 'device-principal';

const { hardwareWallets, webHid } = vi.hoisted(() => ({
  hardwareWallets: vi.fn(() => [] as unknown[]),
  webHid: vi.fn(() => false),
}));

vi.mock('@features/accounts/hooks/useHardwareWalletsMetadata', () => ({
  useHardwareWalletsMetadata: () => ({ data: hardwareWallets(), isLoading: false }),
}));

vi.mock('@common/ledger/webhid', () => ({
  isWebHidSupported: () => webHid(),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: {
      getPrincipal: () => ({ toText: () => CONTROLLER }),
    },
  }),
}));

vi.mock('@hooks/tickers/useIcpPrice', () => ({
  useIcpPrice: () => ({ icpPrice: undefined, isLoading: false }),
}));

vi.mock('@hooks/useApyColor', () => ({
  useApyColor: () => ({ ready: false }),
}));

vi.mock('@hooks/governance/useGovernanceEconomics', () => ({
  useGovernanceEconomics: () => ({ data: undefined, isLoading: false }),
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
    followees: [{ topic: 4, followees: [99n] }],
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
  describe('Ledger device badge', () => {
    const device = {
      name: 'Nano X',
      accountId: 'device-account',
      type: AccountType.HardwareWallet,
      principal: DEVICE_PRINCIPAL,
    };

    it('shows the badge with the device name when a registered device controls the neuron', () => {
      hardwareWallets.mockReturnValue([device]);

      render(
        <NeuronCard
          neuron={mockNeuron({
            fullNeuron: { controller: DEVICE_PRINCIPAL, hotKeys: [CONTROLLER] },
          })}
        />,
      );

      expect(getTestId('neuron-ledger-device-badge').getAttribute('title')).toBe('Nano X');
      expect(getTestId('neuron-ledger-device-badge').textContent).toContain('Ledger device');
    });

    it('hides the badge when the controller is not a registered device', () => {
      hardwareWallets.mockReturnValue([device]);

      render(<NeuronCard neuron={mockNeuron()} />);

      expect(queryTestId('neuron-ledger-device-badge')).toBeNull();
    });

    it('hides the badge when no device is registered', () => {
      hardwareWallets.mockReturnValue([]);

      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { controller: DEVICE_PRINCIPAL } })} />);

      expect(queryTestId('neuron-ledger-device-badge')).toBeNull();
    });
  });

  describe('maturity mode', () => {
    it('shows "keep liquid" when auto-stake maturity is off', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { autoStakeMaturity: false } })} />);

      expect(queryTestId('neuron-card-maturity-keep-liquid')).toBeTruthy();
      expect(queryTestId('neuron-card-maturity-auto-stake')).toBeFalsy();
    });

    it('shows "auto stake" when auto-stake maturity is on', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { autoStakeMaturity: true } })} />);

      expect(queryTestId('neuron-card-maturity-auto-stake')).toBeTruthy();
      expect(queryTestId('neuron-card-maturity-keep-liquid')).toBeFalsy();
    });
  });

  describe('disbursing maturity row', () => {
    it('shows the row with the total when disbursements are in progress', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({
            fullNeuron: {
              maturityDisbursementsInProgress: [
                mockDisbursement({ amountE8s: BigInt(2 * E8S) }),
                mockDisbursement({ amountE8s: BigInt(3 * E8S) }),
              ],
            },
          })}
        />,
      );

      expect(getTestId('neuron-card-disbursing-maturity').textContent).toContain('5.00');
    });

    it('shows the row when a disbursement has no amount', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({
            fullNeuron: {
              maturityDisbursementsInProgress: [mockDisbursement({ amountE8s: undefined })],
            },
          })}
        />,
      );

      expect(queryTestId('neuron-card-disbursing-maturity')).toBeTruthy();
    });

    it('hides the row when no disbursement is in progress', () => {
      render(<NeuronCard neuron={mockNeuron()} />);

      expect(queryTestId('neuron-card-disbursing-maturity')).toBeFalsy();
    });
  });

  describe('no-following warning', () => {
    it('shows warning when neuron has no followees', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { followees: [] } })} />);

      expect(queryTestId('neuron-card-no-following-warning')).toBeTruthy();
    });

    it('hides warning when neuron has followees', () => {
      render(
        <NeuronCard
          neuron={mockNeuron({
            fullNeuron: { followees: [{ topic: 4, followees: [99n] }] },
          })}
        />,
      );

      expect(queryTestId('neuron-card-no-following-warning')).toBeFalsy();
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

      expect(queryTestId('neuron-hotkey-badge')).toBeTruthy();
    });

    it('hides badge when user is the controller', () => {
      render(<NeuronCard neuron={mockNeuron()} />);

      expect(queryTestId('neuron-hotkey-badge')).toBeFalsy();
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

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeTruthy();
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

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
    });

    it('hides when neuron is not dissolved', () => {
      render(<NeuronCard neuron={mockNeuron({ state: NeuronState.Locked })} />);

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
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

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
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

      expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeTruthy();
    });

    it('hides when neuron has no unstaked maturity', () => {
      render(<NeuronCard neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: 0n } })} />);

      expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeFalsy();
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

      expect(queryTestId('neuron-card-stake-maturity-btn')).toBeTruthy();
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

      expect(queryTestId('neuron-card-stake-maturity-btn')).toBeFalsy();
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

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
      expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeFalsy();
      expect(queryTestId('neuron-card-stake-maturity-btn')).toBeFalsy();
    });
  });

  describe('Ledger device neuron', () => {
    const device = {
      name: 'Nano X',
      accountId: 'device-account',
      type: AccountType.HardwareWallet,
      principal: DEVICE_PRINCIPAL,
    };
    const deviceNeuron = () =>
      mockNeuron({
        state: NeuronState.Dissolved,
        fullNeuron: {
          cachedNeuronStake: BigInt(5 * E8S),
          maturityE8sEquivalent: BigInt(2 * E8S),
          controller: DEVICE_PRINCIPAL,
          hotKeys: [CONTROLLER],
        },
      });

    it('shows the action buttons and no hotkey badge when the device can sign', () => {
      hardwareWallets.mockReturnValue([device]);
      webHid.mockReturnValue(true);

      render(<NeuronCard neuron={deviceNeuron()} />);

      expect(getTestId('neuron-card-disburse-icp-btn')).toBeTruthy();
      expect(getTestId('neuron-card-disburse-maturity-btn')).toBeTruthy();
      expect(queryTestId('neuron-hotkey-badge')).toBeFalsy();
      expect(getTestId('neuron-ledger-device-badge')).toBeTruthy();
    });

    it('hides the action buttons when the browser has no WebHID', () => {
      hardwareWallets.mockReturnValue([device]);
      webHid.mockReturnValue(false);

      render(<NeuronCard neuron={deviceNeuron()} />);

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
      expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeFalsy();
      expect(getTestId('neuron-hotkey-badge')).toBeTruthy();
    });

    it('hides the action buttons when the device is not registered', () => {
      hardwareWallets.mockReturnValue([]);
      webHid.mockReturnValue(true);

      render(<NeuronCard neuron={deviceNeuron()} />);

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
      expect(getTestId('neuron-hotkey-badge')).toBeTruthy();
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

      expect(queryTestId('neuron-card-disburse-icp-btn')).toBeFalsy();
      expect(queryTestId('neuron-card-disburse-maturity-btn')).toBeFalsy();
      expect(queryTestId('neuron-card-stake-maturity-btn')).toBeFalsy();
    });
  });
});
