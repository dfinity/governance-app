import '@/i18n/config';

import { TxDuplicateError, TxTooOldError } from '@icp-sdk/canisters/ledger/icp';
import {
  CouldNotClaimNeuronError,
  NeuronState,
  UnrecognizedTypeError,
} from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ICP_TRANSACTION_FEE_E8Sn, SECONDS_IN_DAY } from '@constants/extra';
import {
  cancelPendingDeviceAction,
  DeviceActionCancelledError,
  usePendingDeviceAction,
} from '@hooks/useDeviceAction';
import { mockNeuron } from '@fixtures/neuron';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';
import { II_SIGNER } from '@common/ledger/signer';

import { StakingWizardCreateNeuronStep } from '../components/stakingWizard/types';
import { getStakeAccountIdentifier } from '../utils/ledgerStake';
import { useCreateNeuron } from './useCreateNeuron';

const II_PRINCIPAL = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
const DEVICE_PRINCIPAL = 'aaaaa-aa';
const DEVICE_SIGNER = { kind: 'ledger', principal: DEVICE_PRINCIPAL } as const;

const mocks = vi.hoisted(() => ({
  // Internet Identity canisters (the `use*` hooks).
  iiGovernance: {
    stakeNeuron: vi.fn(),
    addHotkey: vi.fn(),
    increaseDissolveDelay: vi.fn(),
    autoStakeMaturity: vi.fn(),
    startDissolving: vi.fn(),
    listNeurons: vi.fn(),
    setFollowing: vi.fn(),
    getNeuron: vi.fn(),
  },
  iiLedger: { transfer: vi.fn() },
  // Device canisters (the factories with a signer).
  deviceGovernance: {
    addHotkey: vi.fn(),
    increaseDissolveDelay: vi.fn(),
    autoStakeMaturity: vi.fn(),
    startDissolving: vi.fn(),
  },
  deviceLedger: { transfer: vi.fn() },
  anonymousGovernance: { claimOrRefreshNeuronFromAccount: vi.fn() },
  getNnsGovernanceCanister: vi.fn(),
  getIcpLedgerCanister: vi.fn(),
  getAnonymousNnsGovernanceCanister: vi.fn(),
  deviceIdentity: { flagUpcomingStakeNeuron: vi.fn() },
  runOnDevice: vi.fn(),
  runApprovedDeviceCall: vi.fn(),
  analyticsEvent: vi.fn(),
  readPendingDeviceStake: vi.fn(),
  writePendingDeviceStake: vi.fn(),
  clearPendingDeviceStake: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
  getIcpLedgerCanister: mocks.getIcpLedgerCanister,
  getAnonymousNnsGovernanceCanister: mocks.getAnonymousNnsGovernanceCanister,
}));
vi.mock('@common/ledger/session', () => ({
  getLedgerIdentity: () => Promise.resolve(mocks.deviceIdentity),
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
vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: mocks.iiGovernance, ready: true, authenticated: true }),
}));
vi.mock('@hooks/icpLedger', () => ({
  useIcpLedger: () => ({ canister: mocks.iiLedger, ready: true, authenticated: true }),
}));
vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => Principal.fromText(II_PRINCIPAL) },
  }),
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));

// A clock that moves on every call, so two attempts never share a createdAt by accident.
let clock = 0;
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  nowInBigIntNanoSeconds: () => BigInt(++clock),
}));
vi.mock('../utils/pendingDeviceStake', () => ({
  readPendingDeviceStake: mocks.readPendingDeviceStake,
  writePendingDeviceStake: mocks.writePendingDeviceStake,
  clearPendingDeviceStake: mocks.clearPendingDeviceStake,
}));

type Options = {
  signer?: typeof DEVICE_SIGNER | typeof II_SIGNER;
  autoStake?: boolean;
  dissolving?: boolean;
};

const renderCreateNeuron = ({ signer, autoStake = true, dissolving = false }: Options = {}) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(
    () => ({
      ...useCreateNeuron({
        amount: '10',
        dissolveDelaySeconds: SECONDS_IN_DAY * 30,
        autoStakeMaturity: autoStake,
        startDissolving: dissolving,
        selectedAccountId: 'source-account',
        signer,
      }),
      pending: usePendingDeviceAction(),
    }),
    { wrapper },
  );
};

/** The description of every device approval, in the order the hook asked for them. */
const approvalDescriptions = () =>
  mocks.runApprovedDeviceCall.mock.calls.map(([, , options]) => options.description);

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

let runApprovedDeviceCall: typeof import('@common/ledger/approvedDeviceCall').runApprovedDeviceCall;

describe('useCreateNeuron', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearDeviceApprovals();
    ({ runApprovedDeviceCall } = await vi.importActual<
      typeof import('@common/ledger/approvedDeviceCall')
    >('@common/ledger/approvedDeviceCall'));
    mocks.runApprovedDeviceCall.mockImplementation(runApprovedDeviceCall);
    mocks.getNnsGovernanceCanister.mockResolvedValue(mocks.deviceGovernance);
    mocks.getIcpLedgerCanister.mockResolvedValue(mocks.deviceLedger);
    mocks.getAnonymousNnsGovernanceCanister.mockResolvedValue(mocks.anonymousGovernance);
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
    mocks.iiGovernance.stakeNeuron.mockResolvedValue(42n);
    mocks.iiGovernance.listNeurons.mockResolvedValue([]);
    // A new neuron: the default 7-day delay, not dissolving.
    mocks.iiGovernance.getNeuron.mockResolvedValue(
      mockNeuron({ neuronId: 42n, dissolveDelaySeconds: BigInt(SECONDS_IN_DAY * 7) }),
    );
    mocks.readPendingDeviceStake.mockReturnValue(undefined);
    mocks.deviceLedger.transfer.mockResolvedValue(1n);
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount.mockResolvedValue(42n);
  });

  it('stakes with the session: one stakeNeuron call, then the steps on the session canister', async () => {
    const { result } = renderCreateNeuron({ signer: II_SIGNER, dissolving: true });

    await act(() => result.current.mutateAsync());

    expect(mocks.iiGovernance.stakeNeuron).toHaveBeenCalledWith(
      expect.objectContaining({
        stake: 1_000_000_000n,
        principal: Principal.fromText(II_PRINCIPAL),
        ledgerCanister: mocks.iiLedger,
        fee: ICP_TRANSACTION_FEE_E8Sn,
      }),
    );
    expect(mocks.iiGovernance.increaseDissolveDelay).toHaveBeenCalledWith({
      neuronId: 42n,
      additionalDissolveDelaySeconds: SECONDS_IN_DAY * 23,
    });
    expect(mocks.iiGovernance.autoStakeMaturity).toHaveBeenCalledWith({
      neuronId: 42n,
      autoStake: true,
    });
    expect(mocks.iiGovernance.startDissolving).toHaveBeenCalledWith(42n);
    expect(mocks.iiGovernance.addHotkey).not.toHaveBeenCalled();
    expect(mocks.runApprovedDeviceCall).not.toHaveBeenCalled();
    expect(mocks.getAnonymousNnsGovernanceCanister).not.toHaveBeenCalled();
    expect(mocks.iiGovernance.getNeuron).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).not.toHaveBeenCalled();
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('stakes with the device: flagged transfer, anonymous claim, hotkey, then the controller steps on the device', async () => {
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await act(() => result.current.mutateAsync());

    // The transfer goes to the sub-account derived from the device principal and the memo.
    expect(mocks.getIcpLedgerCanister).toHaveBeenCalledWith({ signer: DEVICE_SIGNER });
    expect(mocks.deviceIdentity.flagUpcomingStakeNeuron).toHaveBeenCalledTimes(1);
    const transfer = mocks.deviceLedger.transfer.mock.calls[0][0];
    const controller = Principal.fromText(DEVICE_PRINCIPAL);
    expect(transfer.amount).toBe(1_000_000_000n);
    expect(transfer.fee).toBe(ICP_TRANSACTION_FEE_E8Sn);
    expect(transfer.to.toHex()).toBe(
      getStakeAccountIdentifier({ controller, memo: transfer.memo }).toHex(),
    );
    expect(mocks.iiGovernance.stakeNeuron).not.toHaveBeenCalled();

    // The claim is anonymous, with the same memo.
    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenCalledWith({
      controller,
      memo: transfer.memo,
    });

    // The device adds the session as hotkey, then signs the controller steps.
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({ signer: DEVICE_SIGNER });
    expect(mocks.deviceGovernance.addHotkey).toHaveBeenCalledWith({
      neuronId: 42n,
      principal: Principal.fromText(II_PRINCIPAL),
    });
    expect(mocks.deviceGovernance.increaseDissolveDelay).toHaveBeenCalledWith({
      neuronId: 42n,
      additionalDissolveDelaySeconds: SECONDS_IN_DAY * 23,
    });
    expect(mocks.deviceGovernance.autoStakeMaturity).toHaveBeenCalledWith({
      neuronId: 42n,
      autoStake: true,
    });
    expect(mocks.deviceGovernance.startDissolving).not.toHaveBeenCalled();
    expect(mocks.iiGovernance.increaseDissolveDelay).not.toHaveBeenCalled();
    expect(mocks.iiGovernance.autoStakeMaturity).not.toHaveBeenCalled();

    // Following stays with the session.
    expect(mocks.iiGovernance.listNeurons).toHaveBeenCalled();

    // Every device call ran in the queue of the device, behind the approval dialog.
    expect(mocks.runOnDevice).toHaveBeenCalledTimes(4);
    mocks.runOnDevice.mock.calls.forEach(([principal]) => expect(principal).toBe(DEVICE_PRINCIPAL));
    mocks.runApprovedDeviceCall.mock.calls.forEach(([principal]) =>
      expect(principal).toBe(DEVICE_PRINCIPAL),
    );
    expect(approvalDescriptions()).toEqual([
      'Check the amount on the device screen and approve the transfer.',
      'Check the hotkey principal on the device screen and approve.',
      'Approve the lock period on the device screen. The device shows the time to add.',
      'Approve the auto-lock of rewards on the device screen.',
    ]);
    expect(mocks.runApprovedDeviceCall.mock.calls[0][2].detail).toBe('10 ICP');
    expect(mocks.runApprovedDeviceCall.mock.calls[1][2].detail).toBe(II_PRINCIPAL);
    expect(mocks.runApprovedDeviceCall.mock.calls[2][2].detail).toBe('30 days');

    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_stake', {
      amount_range: '10-100',
    });
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('asks the device for the dissolving step when selected', async () => {
    const { result } = renderCreateNeuron({
      signer: DEVICE_SIGNER,
      autoStake: false,
      dissolving: true,
    });

    await act(() => result.current.mutateAsync());

    expect(mocks.deviceGovernance.autoStakeMaturity).not.toHaveBeenCalled();
    expect(mocks.deviceGovernance.startDissolving).toHaveBeenCalledWith(42n);
    expect(approvalDescriptions().at(-1)).toBe(
      'Approve the start of the unlocking on the device screen.',
    );
  });

  it('keeps the transfer and the memo when the claim fails, and the retry claims without a second transfer', async () => {
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount.mockRejectedValueOnce(
      new Error('connection dropped'),
    );
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await expect(act(() => result.current.mutateAsync())).rejects.toThrow('connection dropped');

    await waitFor(() => expect(result.current.isTransferDone).toBe(true));
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.CreateNeuron);
    expect(result.current.error?.message).toBe('connection dropped');
    const memo = mocks.deviceLedger.transfer.mock.calls[0][0].memo;
    // The unclaimed transfer is recorded until the claim succeeds.
    expect(mocks.writePendingDeviceStake).toHaveBeenCalledWith(DEVICE_PRINCIPAL, {
      memo: memo.toString(),
      amount: '10',
    });
    expect(mocks.clearPendingDeviceStake).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_stake_error', {
      reason: 'unknown',
    });

    await act(() => result.current.mutateAsync());

    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenCalledTimes(2);
    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenLastCalledWith({
      controller: Principal.fromText(DEVICE_PRINCIPAL),
      memo,
    });
    expect(result.current.isTransferDone).toBe(false);
    expect(mocks.clearPendingDeviceStake).toHaveBeenCalledWith(DEVICE_PRINCIPAL, memo.toString());
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('claims the unclaimed transfer of an earlier wizard session before any new transfer', async () => {
    mocks.readPendingDeviceStake.mockReturnValue({ memo: '77', amount: '25' });
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount.mockResolvedValueOnce(99n);
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await act(() => result.current.mutateAsync());

    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenCalledTimes(1);
    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenCalledWith({
      controller: Principal.fromText(DEVICE_PRINCIPAL),
      memo: 77n,
    });
    expect(mocks.deviceLedger.transfer).not.toHaveBeenCalled();
    expect(mocks.clearPendingDeviceStake).toHaveBeenCalledWith(DEVICE_PRINCIPAL, '77');
    expect(mocks.deviceGovernance.addHotkey).toHaveBeenCalledWith(
      expect.objectContaining({ neuronId: 99n }),
    );
    expect(result.current.stakedAmount).toBe('25');
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_stake', {
      amount_range: '10-100',
    });
  });

  it('forgets a recorded transfer that funds no neuron and stakes the typed amount', async () => {
    mocks.readPendingDeviceStake.mockReturnValue({ memo: '77', amount: '25' });
    // An empty sub-account answers with a governance error, not with an id.
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount
      .mockRejectedValueOnce(
        new UnrecognizedTypeError(
          'Unrecognized ClaimOrRefresh error in {"command":[{"Error":{"error_message":"not enough funds","error_type":14}}]}',
        ),
      )
      .mockResolvedValueOnce(42n);
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await act(() => result.current.mutateAsync());

    expect(mocks.clearPendingDeviceStake).toHaveBeenCalled();
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.deviceLedger.transfer.mock.calls[0][0].memo).not.toBe(77n);
    expect(result.current.stakedAmount).toBe('10');
  });

  it('applies only the missing dissolve delay and skips a dissolving start that already happened', async () => {
    // A cancelled device call still ran: the delay is set and the neuron dissolves.
    mocks.iiGovernance.getNeuron.mockResolvedValue(
      mockNeuron({
        neuronId: 42n,
        dissolveDelaySeconds: BigInt(SECONDS_IN_DAY * 30),
        state: NeuronState.Dissolving,
      }),
    );
    const { result } = renderCreateNeuron({
      signer: DEVICE_SIGNER,
      autoStake: false,
      dissolving: true,
    });

    await act(() => result.current.mutateAsync());

    expect(mocks.deviceGovernance.increaseDissolveDelay).not.toHaveBeenCalled();
    expect(mocks.deviceGovernance.startDissolving).not.toHaveBeenCalled();
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('increases the delay by the difference with the current one, read inside the device queue', async () => {
    mocks.iiGovernance.getNeuron.mockResolvedValue(
      mockNeuron({ neuronId: 42n, dissolveDelaySeconds: BigInt(SECONDS_IN_DAY * 20) }),
    );
    const order: string[] = [];
    mocks.runOnDevice.mockImplementation(async (_p: string, call: () => Promise<unknown>) => {
      order.push('queue');
      return call();
    });
    mocks.iiGovernance.getNeuron.mockImplementation(async () => {
      order.push('read');
      return mockNeuron({ neuronId: 42n, dissolveDelaySeconds: BigInt(SECONDS_IN_DAY * 20) });
    });
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER, autoStake: false });

    await act(() => result.current.mutateAsync());

    expect(mocks.deviceGovernance.increaseDissolveDelay).toHaveBeenCalledWith({
      neuronId: 42n,
      additionalDissolveDelaySeconds: SECONDS_IN_DAY * 10,
    });
    // transfer, hotkey (read), delay (read): every read follows its queue slot.
    expect(order).toEqual(['queue', 'queue', 'read', 'queue', 'read']);
  });

  it('skips the hotkey and the auto-stake that a cancelled device call already applied', async () => {
    mocks.iiGovernance.getNeuron.mockResolvedValue(
      mockNeuron({
        neuronId: 42n,
        dissolveDelaySeconds: BigInt(SECONDS_IN_DAY * 7),
        fullNeuron: { hotKeys: [II_PRINCIPAL], autoStakeMaturity: true },
      }),
    );
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await act(() => result.current.mutateAsync());

    expect(mocks.deviceGovernance.addHotkey).not.toHaveBeenCalled();
    expect(mocks.deviceGovernance.autoStakeMaturity).not.toHaveBeenCalled();
    expect(mocks.deviceGovernance.increaseDissolveDelay).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('does not ask for a signature when the dialog was cancelled during the device connection', async () => {
    mocks.getIcpLedgerCanister.mockImplementationOnce(async () => {
      cancelPendingDeviceAction();
      return mocks.deviceLedger;
    });
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await expect(act(() => result.current.mutateAsync())).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );

    expect(mocks.deviceIdentity.flagUpcomingStakeNeuron).not.toHaveBeenCalled();
    expect(mocks.deviceLedger.transfer).not.toHaveBeenCalled();
    // The record is written before the signature: the device can still sign after a cancel.
    expect(mocks.writePendingDeviceStake).toHaveBeenCalledTimes(1);
  });

  it('does not ask for a signature when the dialog was cancelled during the neuron read', async () => {
    mocks.iiGovernance.getNeuron.mockImplementationOnce(async () => {
      cancelPendingDeviceAction();
      return mockNeuron({ neuronId: 42n });
    });
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await expect(act(() => result.current.mutateAsync())).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );

    expect(mocks.deviceGovernance.addHotkey).not.toHaveBeenCalled();
  });

  it('claims a recorded transfer inside the device queue, after a transfer the device may still sign', async () => {
    mocks.readPendingDeviceStake.mockReturnValue({ memo: '77', amount: '25' });
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount.mockResolvedValueOnce(99n);
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await act(() => result.current.mutateAsync());

    expect(mocks.runOnDevice.mock.calls[0][0]).toBe(DEVICE_PRINCIPAL);
    expect(mocks.runApprovedDeviceCall).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ detail: '10 ICP' }),
    );
  });

  it('starts over with a new memo and createdAt after the ledger rejected the transfer', async () => {
    mocks.deviceLedger.transfer.mockRejectedValueOnce(new TxTooOldError(0));
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await expect(act(() => result.current.mutateAsync())).rejects.toBeInstanceOf(TxTooOldError);
    await waitFor(() => expect(result.current.error).toBeInstanceOf(TxTooOldError));
    const first = mocks.deviceLedger.transfer.mock.calls[0][0];
    // The retry finds the record of the rejected attempt and claims it first.
    mocks.readPendingDeviceStake.mockReturnValue({ memo: first.memo.toString(), amount: '10' });
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount
      .mockRejectedValueOnce(
        new UnrecognizedTypeError(
          'Unrecognized ClaimOrRefresh error in {"command":[{"Error":{"error_type":14}}]}',
        ),
      )
      .mockResolvedValueOnce(42n);

    await act(() => result.current.mutateAsync());

    const second = mocks.deviceLedger.transfer.mock.calls[1][0];
    expect(second.memo).not.toBe(first.memo);
    expect(second.createdAt).not.toBe(first.createdAt);
    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ memo: first.memo }),
    );
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('treats a duplicate transfer as done, so a retry after a late device signature claims the neuron', async () => {
    mocks.deviceLedger.transfer.mockRejectedValueOnce(new TxDuplicateError(7n));
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await act(() => result.current.mutateAsync());

    expect(mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('fails the stake when the claim finds no neuron', async () => {
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount.mockResolvedValueOnce(undefined);
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await expect(act(() => result.current.mutateAsync())).rejects.toBeInstanceOf(
      CouldNotClaimNeuronError,
    );
    expect(mocks.deviceGovernance.addHotkey).not.toHaveBeenCalled();
  });

  it('stops at the failed step when the user cancels the approval dialog', async () => {
    mocks.runApprovedDeviceCall
      .mockImplementationOnce(runApprovedDeviceCall)
      .mockRejectedValueOnce(new DeviceActionCancelledError());
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    await expect(act(() => result.current.mutateAsync())).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );

    await waitFor(() =>
      expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.AddHotkey),
    );
    expect(mocks.deviceGovernance.increaseDissolveDelay).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_stake_error', {
      reason: 'cancelled',
    });
  });

  it('opens the approval dialog only at the queue turn of the device', async () => {
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementationOnce(
      async (_principal: string, call: () => Promise<unknown>) => {
        await turn.promise;
        return call();
      },
    );
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    let stake!: Promise<void>;
    act(() => {
      stake = result.current.mutateAsync();
    });
    await flush();
    // Another device request is outstanding: no dialog, no device access.
    expect(result.current.pending).toBeNull();
    expect(mocks.getIcpLedgerCanister).not.toHaveBeenCalled();
    expect(mocks.deviceIdentity.flagUpcomingStakeNeuron).not.toHaveBeenCalled();

    const signing = deferred<bigint>();
    mocks.deviceLedger.transfer.mockReturnValueOnce(signing.promise);
    await act(async () => {
      turn.resolve();
    });
    await flush();
    expect(result.current.pending?.description).toBe(
      'Check the amount on the device screen and approve the transfer.',
    );
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve(1n);
      await stake;
    });
    expect(result.current.pending).toBeNull();
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
  });

  it('goes on with the next step when the device signs a cancelled approval late', async () => {
    const signing = deferred<void>();
    mocks.deviceGovernance.addHotkey.mockReturnValueOnce(signing.promise);
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });

    let stake!: Promise<void>;
    act(() => {
      stake = result.current.mutateAsync();
    });
    await act(async () => {
      await waitFor(() => expect(mocks.deviceGovernance.addHotkey).toHaveBeenCalledTimes(1));
    });
    act(() => cancelPendingDeviceAction());
    expect(result.current.pending).toBeNull();
    // The stake stays pending: the device still asks for the hotkey.
    expect(mocks.deviceGovernance.increaseDissolveDelay).not.toHaveBeenCalled();

    await act(async () => {
      signing.resolve();
      await stake;
    });
    expect(mocks.deviceGovernance.increaseDissolveDelay).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.Done);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_stake', {
      amount_range: '10-100',
    });
  });

  it('reset clears the device stake state', async () => {
    mocks.anonymousGovernance.claimOrRefreshNeuronFromAccount.mockRejectedValueOnce(new Error('x'));
    const { result } = renderCreateNeuron({ signer: DEVICE_SIGNER });
    await expect(act(() => result.current.mutateAsync())).rejects.toThrow('x');
    await waitFor(() => expect(result.current.isTransferDone).toBe(true));

    act(() => result.current.reset());

    expect(result.current.isTransferDone).toBe(false);
    expect(result.current.currentStep).toBe(StakingWizardCreateNeuronStep.CreateNeuron);
  });
});
