import '@/i18n/config';

import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';

import { usePendingDeviceAction } from '@hooks/useDeviceAction';
import { QUERY_KEYS } from '@utils/query';
import type { Signer } from '@common/ledger/signer';

import { useDisburseMaturity } from './useDisburseMaturity';
import { useDisburseNeuron } from './useDisburseNeuron';
import { useIncreaseDelay } from './useIncreaseDelay';
import type { LedgerNeuronAction } from './useLedgerNeuronCall';
import { useStakeMaturity } from './useStakeMaturity';
import { useToggleDissolving } from './useToggleDissolving';
import { useToggleMaturityMode } from './useToggleMaturityMode';

const mocks = vi.hoisted(() => ({
  sessionCanister: {
    increaseDissolveDelay: vi.fn(),
    startDissolving: vi.fn(),
    stopDissolving: vi.fn(),
    autoStakeMaturity: vi.fn(),
    stakeMaturity: vi.fn(),
    disburse: vi.fn(),
    disburseMaturity: vi.fn(),
  },
  deviceCanister: {
    increaseDissolveDelay: vi.fn(),
    startDissolving: vi.fn(),
    stopDissolving: vi.fn(),
    autoStakeMaturity: vi.fn(),
    stakeMaturity: vi.fn(),
    disburse: vi.fn(),
    disburseMaturity: vi.fn(),
  },
  getNnsGovernanceCanister: vi.fn(),
  runOnDevice: vi.fn(),
  event: vi.fn(),
}));

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: mocks.sessionCanister, ready: true, authenticated: true }),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => 'ii-principal' }) },
  }),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
}));

vi.mock('@common/ledger/deviceQueue', () => ({
  runOnDevice: mocks.runOnDevice,
}));

vi.mock('@features/analytics/service', () => ({
  analytics: { event: mocks.event },
}));

const DEVICE = 'aaaaa-aa';
const DEVICE_SIGNER: Signer = { kind: 'ledger', principal: DEVICE };
const NEURON_ID = 7n;
const ACCOUNT = 'd3e13d4777e22367532053190b6c6ccf57444a61337e996242b1abfb52cf92c8';
const OWNER = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

type Method = keyof typeof mocks.sessionCanister;

type Case = {
  name: string;
  /** Renders the hook and returns a function that runs its mutation. */
  setup: () => (signer?: Signer) => Promise<unknown>;
  method: Method;
  args: unknown;
  action: LedgerNeuronAction;
  /** Lines of the approval dialog detail. */
  detail: string[];
};

let queryClient: QueryClient;
let pending: ReturnType<typeof usePendingDeviceAction>;

const renderWithClient = <T,>(hook: () => T) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => {
      pending = usePendingDeviceAction();
      return hook();
    },
    { wrapper },
  );
  return result;
};

const CASES: Case[] = [
  {
    name: 'useIncreaseDelay',
    setup: () => {
      const result = renderWithClient(useIncreaseDelay);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          dissolveDelaySeconds: 170,
          currentDissolveDelaySeconds: 50,
          signer,
        });
    },
    method: 'increaseDissolveDelay',
    args: { neuronId: NEURON_ID, additionalDissolveDelaySeconds: 120 },
    action: 'increase_delay',
    detail: ['Neuron 7', 'Additional delay: 2 minutes'],
  },
  {
    name: 'useToggleDissolving (start)',
    setup: () => {
      const result = renderWithClient(useToggleDissolving);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          startDissolving: true,
          signer,
        });
    },
    method: 'startDissolving',
    args: NEURON_ID,
    action: 'start_dissolving',
    detail: ['Neuron 7'],
  },
  {
    name: 'useToggleDissolving (stop)',
    setup: () => {
      const result = renderWithClient(useToggleDissolving);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          startDissolving: false,
          signer,
        });
    },
    method: 'stopDissolving',
    args: NEURON_ID,
    action: 'stop_dissolving',
    detail: ['Neuron 7'],
  },
  {
    name: 'useToggleMaturityMode',
    setup: () => {
      const result = renderWithClient(useToggleMaturityMode);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          autoStake: true,
          signer,
        });
    },
    method: 'autoStakeMaturity',
    args: { neuronId: NEURON_ID, autoStake: true },
    action: 'set_maturity_mode',
    detail: ['Neuron 7', 'Auto-stake maturity: on'],
  },
  {
    name: 'useStakeMaturity',
    setup: () => {
      const result = renderWithClient(useStakeMaturity);
      return (signer) => result.current.mutateAsync({ neuronId: NEURON_ID, signer });
    },
    method: 'stakeMaturity',
    args: { neuronId: NEURON_ID, percentageToStake: 100 },
    action: 'stake_maturity',
    detail: ['Neuron 7', 'Percentage: 100%'],
  },
  {
    name: 'useDisburseNeuron',
    setup: () => {
      const result = renderWithClient(useDisburseNeuron);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          toAccountId: ACCOUNT,
          signer,
        });
    },
    method: 'disburse',
    args: { neuronId: NEURON_ID, toAccountId: ACCOUNT },
    action: 'disburse',
    detail: ['Neuron 7', `To: ${ACCOUNT}`],
  },
  {
    name: 'useDisburseMaturity (ICP destination)',
    setup: () => {
      const result = renderWithClient(useDisburseMaturity);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          destination: { kind: 'icp', accountIdentifier: ACCOUNT },
          percentageToDisburse: 50,
          signer,
        });
    },
    method: 'disburseMaturity',
    args: { neuronId: NEURON_ID, percentageToDisburse: 50, toAccountIdentifier: ACCOUNT },
    action: 'disburse_maturity',
    detail: ['Neuron 7', 'Percentage: 50%', `To: ${ACCOUNT}`],
  },
  {
    name: 'useDisburseMaturity (ICRC-1 destination)',
    setup: () => {
      const result = renderWithClient(useDisburseMaturity);
      return (signer) =>
        result.current.mutateAsync({
          neuronId: NEURON_ID,
          destination: { kind: 'icrc1', owner: OWNER },
          percentageToDisburse: 100,
          signer,
        });
    },
    method: 'disburseMaturity',
    args: {
      neuronId: NEURON_ID,
      percentageToDisburse: 100,
      toAccount: { owner: OWNER, subaccount: undefined },
    },
    action: 'disburse_maturity',
    detail: ['Neuron 7', 'Percentage: 100%', `To: ${OWNER.toText()}`],
  },
];

describe.each(CASES)('$name', ({ setup, method, args, action, detail }) => {
  beforeEach(() => {
    queryClient = new QueryClient();
    for (const canister of [mocks.sessionCanister, mocks.deviceCanister]) {
      for (const fn of Object.values(canister)) fn.mockReset().mockResolvedValue(undefined);
    }
    mocks.getNnsGovernanceCanister.mockReset().mockResolvedValue(mocks.deviceCanister);
    mocks.runOnDevice.mockReset().mockImplementation((_principal, call) => call());
    mocks.event.mockReset();
  });

  it('signs with the Internet Identity session by default', async () => {
    const mutate = setup();

    await act(() => mutate());

    expect(mocks.sessionCanister[method]).toHaveBeenCalledWith(args);
    expect(mocks.getNnsGovernanceCanister).not.toHaveBeenCalled();
    expect(mocks.runOnDevice).not.toHaveBeenCalled();
  });

  it('signs with the Ledger device of the signer behind the approval dialog', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    let dialog: typeof pending = null;
    mocks.deviceCanister[method].mockImplementation(async () => {
      dialog = pending;
    });
    const mutate = setup();

    await act(() => mutate(DEVICE_SIGNER));

    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE, expect.any(Function));
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({ signer: DEVICE_SIGNER });
    expect(mocks.deviceCanister[method]).toHaveBeenCalledWith(args);
    expect(mocks.sessionCanister[method]).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
    });
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceAction, { action });
    expect(pending).toBeNull();

    // The dialog was open during the device call, with the values to check on the screen.
    expect(dialog).not.toBeNull();
    render(<>{dialog!.detail}</>);
    for (const line of detail) expect(screen.getByText(line)).toBeTruthy();
  });

  it('rejects when the device call fails and refreshes nothing', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    mocks.deviceCanister[method].mockRejectedValue(new Error('rejected'));
    const mutate = setup();

    await act(async () => {
      await expect(mutate(DEVICE_SIGNER)).rejects.toThrow('rejected');
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.event).toHaveBeenCalledWith(AnalyticsEvent.LedgerDeviceActionError, {
      action,
      reason: 'unknown',
    });
  });
});
