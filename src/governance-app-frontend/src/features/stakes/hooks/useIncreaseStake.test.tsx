import '@/i18n/config';

import { AccountIdentifier, TxTooOldError } from '@icp-sdk/canisters/ledger/icp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import {
  cancelPendingDeviceAction,
  DeviceActionCancelledError,
  usePendingDeviceAction,
} from '@hooks/useDeviceAction';
import { QUERY_KEYS } from '@utils/query';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';

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
  runApprovedDeviceCall: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getIcpLedgerCanister: mocks.getIcpLedgerCanister,
  getAnonymousNnsGovernanceCanister: mocks.getAnonymousNnsGovernanceCanister,
}));
vi.mock('@common/ledger/deviceQueue', () => ({
  runOnDevice: mocks.runOnDevice,
  getDeviceSessionGeneration: () => 0,
}));
// A spy on the shared helper: the tests read the dialog options and force a cancel through it.
vi.mock('@common/ledger/approvedDeviceCall', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@common/ledger/approvedDeviceCall')>()),
  runApprovedDeviceCall: mocks.runApprovedDeviceCall,
}));

// An in-memory record of the top-ups whose refresh is pending (the storage of the app).
type Pending = { neuronId: string; amount: string; createdAt: string; transferred: boolean };
const pendingTopUps = new Map<string, Pending>();
vi.mock('../utils/pendingDeviceTopUp', () => ({
  readPendingDeviceTopUp: (key: string) => pendingTopUps.get(key),
  writePendingDeviceTopUp: (key: string, pending: Pending) => pendingTopUps.set(key, pending),
  clearPendingDeviceTopUp: (key: string, createdAt: string) => {
    if (pendingTopUps.get(key)?.createdAt === createdAt) pendingTopUps.delete(key);
  },
}));
// A clock that moves on every call, so two attempts never share a createdAt by accident.
let clock = 0;
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  nowInBigIntNanoSeconds: () => BigInt(++clock),
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

  return {
    ...renderHook(() => ({ ...useIncreaseStake(), pending: usePendingDeviceAction() }), {
      wrapper,
    }),
    invalidateQueries,
  };
};

const params = {
  neuronId: 42n,
  accountIdentifier: NEURON_ACCOUNT,
  amount: 5,
  selectedAccountId: 'source-account',
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

// The dialog opens one tick after the call starts: after the queue turn and the approval chain.
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe('useIncreaseStake', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearDeviceApprovals();
    mocks.getIcpLedgerCanister.mockResolvedValue(mocks.deviceLedger);
    mocks.getAnonymousNnsGovernanceCanister.mockResolvedValue(mocks.anonymousGovernance);
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
    const { runApprovedDeviceCall } = await vi.importActual<
      typeof import('@common/ledger/approvedDeviceCall')
    >('@common/ledger/approvedDeviceCall');
    mocks.runApprovedDeviceCall.mockImplementation(runApprovedDeviceCall);
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
    expect(mocks.runApprovedDeviceCall).not.toHaveBeenCalled();
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
    expect(mocks.runApprovedDeviceCall.mock.calls[0][0]).toBe(DEVICE_PRINCIPAL);
    expect(mocks.runApprovedDeviceCall.mock.calls[0][2].description).toBe(
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
    // The dialog is cancelled before the device answers; the transfer never ran.
    mocks.runApprovedDeviceCall.mockRejectedValueOnce(new DeviceActionCancelledError());
    const topUp = { ...params, amount: 9, signer: DEVICE_SIGNER };
    const first = renderIncreaseStake();
    await expect(act(() => first.result.current.mutateAsync(topUp))).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );
    const recorded = [...pendingTopUps.values()][0];
    expect(recorded).toEqual({
      neuronId: '42',
      amount: '9',
      createdAt: expect.any(String),
      transferred: false,
    });
    first.unmount();

    // The same top-up from a new view is the same ledger transaction.
    const second = renderIncreaseStake();
    await act(() => second.result.current.mutateAsync(topUp));
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.deviceLedger.transfer.mock.calls[0][0].createdAt).toBe(BigInt(recorded.createdAt));

    // A done top-up starts a new transaction next time.
    await act(() => second.result.current.mutateAsync(topUp));
    expect(mocks.deviceLedger.transfer.mock.calls[1][0].createdAt).not.toBe(
      BigInt(recorded.createdAt),
    );
  });

  it('refreshes the neuron when the device signs a cancelled top-up late', async () => {
    const signing = deferred<bigint>();
    mocks.deviceLedger.transfer.mockReturnValueOnce(signing.promise);
    const { result } = renderIncreaseStake();

    let topUp!: Promise<void>;
    act(() => {
      topUp = result.current.mutateAsync({ ...params, amount: 9, signer: DEVICE_SIGNER });
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    expect(result.current.pending).toBeNull();
    // The top-up stays pending: the device still asks for the transfer.
    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).not.toHaveBeenCalled();

    await act(async () => {
      signing.resolve(2n);
      await topUp;
    });
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).toHaveBeenCalledTimes(1);
    expect(pendingTopUps.size).toBe(0);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_top_up', {
      amount_range: '1-10',
    });
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

    expect([...pendingTopUps.values()]).toEqual([
      { neuronId: '42', amount: '13', createdAt: expect.any(String), transferred: true },
    ]);

    // The recovery pass refreshed the neuron and forgot the record: the same top-up is a new
    // transfer, not a duplicate of the done one.
    const first = mocks.deviceLedger.transfer.mock.calls[0][0].createdAt;
    pendingTopUps.clear();
    await act(() => result.current.mutateAsync({ ...params, amount: 13, signer: DEVICE_SIGNER }));
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(2);
    expect(mocks.deviceLedger.transfer.mock.calls[1][0].createdAt).not.toBe(first);
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

  it('confirms the transfer in the record even when the dialog was cancelled', async () => {
    const signing = deferred<bigint>();
    mocks.deviceLedger.transfer.mockReturnValueOnce(signing.promise);
    mocks.anonymousGovernance.claimOrRefreshNeuron.mockRejectedValueOnce(new Error('dropped'));
    const { result } = renderIncreaseStake();

    let topUp!: Promise<void>;
    act(() => {
      topUp = result.current.mutateAsync({ ...params, amount: 14, signer: DEVICE_SIGNER });
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    expect([...pendingTopUps.values()]).toEqual([
      { neuronId: '42', amount: '14', createdAt: expect.any(String), transferred: false },
    ]);

    // The device signs after the cancel and the refresh fails. The recovery pass can refresh
    // the neuron: the record says the transfer went through.
    await act(async () => {
      signing.resolve(2n);
      await expect(topUp).rejects.toThrow('dropped');
    });
    expect([...pendingTopUps.values()]).toEqual([
      { neuronId: '42', amount: '14', createdAt: expect.any(String), transferred: true },
    ]);
    pendingTopUps.clear();
  });

  it('opens the approval dialog only at the queue turn of the device', async () => {
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementationOnce(
      async (_principal: string, call: () => Promise<unknown>) => {
        await turn.promise;
        return call();
      },
    );
    const { result } = renderIncreaseStake();

    let topUp!: Promise<void>;
    act(() => {
      topUp = result.current.mutateAsync({ ...params, signer: DEVICE_SIGNER });
    });
    await flush();
    // Another device request is outstanding: no dialog, no device access.
    expect(result.current.pending).toBeNull();
    expect(mocks.getIcpLedgerCanister).not.toHaveBeenCalled();

    const signing = deferred<bigint>();
    mocks.deviceLedger.transfer.mockReturnValueOnce(signing.promise);
    await act(async () => {
      turn.resolve();
    });
    await flush();
    expect(result.current.pending?.description).toBe(
      'Check the amount and the neuron account on the device screen and approve the transfer.',
    );
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve(2n);
      await topUp;
    });
    expect(result.current.pending).toBeNull();
    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).toHaveBeenCalledTimes(1);
  });

  it('does not ask for a signature when the dialog was cancelled during the device connection', async () => {
    mocks.getIcpLedgerCanister.mockImplementationOnce(async () => {
      cancelPendingDeviceAction();
      return mocks.deviceLedger;
    });
    const { result } = renderIncreaseStake();

    await expect(
      act(() => result.current.mutateAsync({ ...params, signer: DEVICE_SIGNER })),
    ).rejects.toBeInstanceOf(DeviceActionCancelledError);

    expect(mocks.deviceLedger.transfer).not.toHaveBeenCalled();
    expect(mocks.anonymousGovernance.claimOrRefreshNeuron).not.toHaveBeenCalled();
    // The record is written before the signature: the device can still sign after a cancel.
    expect([...pendingTopUps.values()]).toEqual([
      { neuronId: '42', amount: '5', createdAt: expect.any(String), transferred: false },
    ]);
    pendingTopUps.clear();
  });

  it('reports a cancelled approval and refreshes nothing', async () => {
    mocks.runApprovedDeviceCall.mockRejectedValueOnce(new DeviceActionCancelledError());
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
