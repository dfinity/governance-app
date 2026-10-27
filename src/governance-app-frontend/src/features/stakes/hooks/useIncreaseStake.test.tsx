import '@/i18n/config';

import { AccountIdentifier, TxTooOldError } from '@icp-sdk/canisters/ledger/icp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import { DeviceActionCancelledError } from '@hooks/useDeviceAction';
import { QUERY_KEYS } from '@utils/query';

import { useIncreaseStake } from './useIncreaseStake';

const DEVICE_PRINCIPAL = 'aaaaa-aa';
const DEVICE_SIGNER = { kind: 'ledger', principal: DEVICE_PRINCIPAL } as const;
const NEURON_ACCOUNT = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';

const mocks = vi.hoisted(() => ({
  iiGovernance: { claimOrRefreshNeuron: vi.fn() },
  iiLedger: { transfer: vi.fn() },
  deviceLedger: { transfer: vi.fn() },
  anonymousGovernance: { claimOrRefreshNeuron: vi.fn() },
  getIcpLedgerCanister: vi.fn(),
  getAnonymousNnsGovernanceCanister: vi.fn(),
  runOnDevice: vi.fn(),
  runDeviceAction: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getIcpLedgerCanister: mocks.getIcpLedgerCanister,
  getAnonymousNnsGovernanceCanister: mocks.getAnonymousNnsGovernanceCanister,
}));
vi.mock('@common/ledger/deviceQueue', () => ({ runOnDevice: mocks.runOnDevice }));

// An in-memory record of the top-ups whose refresh is pending (the storage of the app).
const pendingTopUps = new Map<string, { neuronId: string; amount: string }>();
vi.mock('../utils/pendingDeviceTopUp', () => ({
  readPendingDeviceTopUp: (key: string) => pendingTopUps.get(key),
  writePendingDeviceTopUp: (key: string, pending: { neuronId: string; amount: string }) =>
    pendingTopUps.set(key, pending),
  clearPendingDeviceTopUp: (key: string) => pendingTopUps.delete(key),
}));
// A clock that moves on every call, so two attempts never share a createdAt by accident.
let clock = 0;
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  nowInBigIntNanoSeconds: () => BigInt(++clock),
}));
vi.mock('@hooks/useDeviceAction', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/useDeviceAction')>()),
  useDeviceAction: () => mocks.runDeviceAction,
}));
vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: mocks.iiGovernance, ready: true, authenticated: true }),
}));
vi.mock('@hooks/icpLedger', () => ({
  useIcpLedger: () => ({ canister: mocks.iiLedger, ready: true, authenticated: true }),
}));
vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: { getPrincipal: () => ({ toText: () => 'ii' }) } }),
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));

const renderIncreaseStake = () => {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...renderHook(() => useIncreaseStake(), { wrapper }), invalidateQueries };
};

const params = {
  neuronId: 42n,
  accountIdentifier: NEURON_ACCOUNT,
  amount: 5,
  selectedAccountId: 'source-account',
};

describe('useIncreaseStake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIcpLedgerCanister.mockResolvedValue(mocks.deviceLedger);
    mocks.getAnonymousNnsGovernanceCanister.mockResolvedValue(mocks.anonymousGovernance);
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
    mocks.runDeviceAction.mockImplementation((action: (signal: AbortSignal) => Promise<unknown>) =>
      action(new AbortController().signal),
    );
    mocks.iiLedger.transfer.mockResolvedValue(1n);
    mocks.deviceLedger.transfer.mockResolvedValue(2n);
    mocks.iiGovernance.claimOrRefreshNeuron.mockResolvedValue(42n);
    mocks.anonymousGovernance.claimOrRefreshNeuron.mockResolvedValue(42n);
  });

  it('transfers and refreshes with the session by default', async () => {
    const { result, invalidateQueries } = renderIncreaseStake();

    await act(() => result.current.mutateAsync({ ...params, fromSubAccount: [1] }));

    expect(mocks.iiLedger.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: AccountIdentifier.fromHex(NEURON_ACCOUNT),
        amount: 500_000_000n,
        fee: ICP_TRANSACTION_FEE_E8Sn,
        fromSubAccount: [1],
      }),
    );
    expect(mocks.iiGovernance.claimOrRefreshNeuron).toHaveBeenCalledWith({
      neuronId: 42n,
      by: { NeuronIdOrSubaccount: {} },
    });
    expect(mocks.runDeviceAction).not.toHaveBeenCalled();
    expect(mocks.getAnonymousNnsGovernanceCanister).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
    });
    expect(mocks.analyticsEvent).toHaveBeenCalledTimes(1);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('neuron_increase_stake', {
      amount_range: '1-10',
    });
  });

  it('transfers with the device behind the approval dialog and refreshes anonymously', async () => {
    const { result } = renderIncreaseStake();

    await act(() => result.current.mutateAsync({ ...params, signer: DEVICE_SIGNER }));

    expect(mocks.getIcpLedgerCanister).toHaveBeenCalledWith({ signer: DEVICE_SIGNER });
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: AccountIdentifier.fromHex(NEURON_ACCOUNT),
        amount: 500_000_000n,
        fee: ICP_TRANSACTION_FEE_E8Sn,
      }),
    );
    expect(mocks.deviceLedger.transfer.mock.calls[0][0].fromSubAccount).toBeUndefined();
    expect(mocks.iiLedger.transfer).not.toHaveBeenCalled();
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE_PRINCIPAL, expect.any(Function));
    expect(mocks.runDeviceAction.mock.calls[0][1].description).toBe(
      'Check the amount and the neuron account on the device screen and approve the transfer.',
    );

    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).toHaveBeenCalledWith({
      neuronId: 42n,
      by: { NeuronIdOrSubaccount: {} },
    });
    expect(mocks.iiGovernance.claimOrRefreshNeuron).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('neuron_increase_stake', {
      amount_range: '1-10',
    });
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_top_up', {
      amount_range: '1-10',
    });
  });

  it('keeps the createdAt of a cancelled device top-up across a view unmount', async () => {
    mocks.runDeviceAction.mockImplementationOnce(
      async (action: (signal: AbortSignal) => Promise<unknown>) => {
        // The user cancels the dialog, the device signs anyway.
        await action(new AbortController().signal);
        throw new DeviceActionCancelledError();
      },
    );
    const topUp = { ...params, amount: 9, signer: DEVICE_SIGNER };
    const first = renderIncreaseStake();
    await expect(act(() => first.result.current.mutateAsync(topUp))).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );
    first.unmount();

    const second = renderIncreaseStake();
    await act(() => second.result.current.mutateAsync(topUp));
    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts).toHaveLength(2);
    expect(createdAts[0]).toBe(createdAts[1]);

    await act(() => second.result.current.mutateAsync(topUp));
    expect(mocks.deviceLedger.transfer.mock.calls[2][0].createdAt).not.toBe(createdAts[0]);
  });

  it('retries only the refresh once the device transfer went through', async () => {
    mocks.anonymousGovernance.claimOrRefreshNeuron.mockRejectedValueOnce(new Error('dropped'));
    const topUp = { ...params, amount: 11, signer: DEVICE_SIGNER };
    const first = renderIncreaseStake();
    await expect(act(() => first.result.current.mutateAsync(topUp))).rejects.toThrow('dropped');
    first.unmount();

    const second = renderIncreaseStake();
    await act(() => second.result.current.mutateAsync(topUp));

    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).toHaveBeenCalledTimes(2);
    expect(pendingTopUps.size).toBe(0);
  });

  it('records a done device transfer until its refresh, for a pass from another view', async () => {
    mocks.anonymousGovernance.claimOrRefreshNeuron.mockRejectedValueOnce(new Error('dropped'));
    const { result } = renderIncreaseStake();

    await expect(
      act(() => result.current.mutateAsync({ ...params, amount: 13, signer: DEVICE_SIGNER })),
    ).rejects.toThrow('dropped');

    expect([...pendingTopUps.values()]).toEqual([{ neuronId: '42', amount: '13' }]);
    pendingTopUps.clear();
  });

  it('forgets the createdAt of a device transfer that the ledger rejected', async () => {
    mocks.deviceLedger.transfer.mockRejectedValueOnce(new TxTooOldError(0));
    const topUp = { ...params, amount: 12, signer: DEVICE_SIGNER };
    const { result } = renderIncreaseStake();

    await expect(act(() => result.current.mutateAsync(topUp))).rejects.toBeInstanceOf(
      TxTooOldError,
    );
    await act(() => result.current.mutateAsync(topUp));

    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts).toHaveLength(2);
    expect(createdAts[0]).not.toBe(createdAts[1]);
  });

  it('reports a cancelled approval and refreshes nothing', async () => {
    mocks.runDeviceAction.mockRejectedValue(new DeviceActionCancelledError());
    const { result, invalidateQueries } = renderIncreaseStake();

    await expect(
      act(() => result.current.mutateAsync({ ...params, signer: DEVICE_SIGNER })),
    ).rejects.toBeInstanceOf(DeviceActionCancelledError);

    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_top_up_error', {
      reason: 'cancelled',
    });
  });
});
