import '@/i18n/config';

import { AccountIdentifier, TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';
import { IcrcTransferError } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelPendingDeviceAction,
  DeviceActionCancelledError,
  usePendingDeviceAction,
} from '@hooks/useDeviceAction';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';
import { LedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

import { useSendIcp } from './useSendIcp';

const DEVICE_PRINCIPAL = 'aaaaa-aa';
const DEVICE_SIGNER = { kind: 'ledger', principal: DEVICE_PRINCIPAL } as const;
const ICP_ADDRESS = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';
const ICRC_ADDRESS = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

const mocks = vi.hoisted(() => ({
  iiLedger: { transfer: vi.fn(), icrc1Transfer: vi.fn() },
  deviceLedger: { transfer: vi.fn(), icrc1Transfer: vi.fn() },
  getIcpLedgerCanister: vi.fn(),
  runOnDevice: vi.fn(),
  runApprovedDeviceCall: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@common/canisters', () => ({ getIcpLedgerCanister: mocks.getIcpLedgerCanister }));
// A clock that moves on every call, so two attempts never share a createdAt by accident.
let clock = 0;
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  nowInBigIntNanoSeconds: () => BigInt(++clock),
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
vi.mock('@hooks/icpLedger/useIcpLedger', () => ({
  useIcpLedger: () => ({ canister: mocks.iiLedger, ready: true, authenticated: true }),
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));

const renderSendIcp = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => ({ ...useSendIcp(), pending: usePendingDeviceAction() }), { wrapper });
};

const analyticsParams = { variant: 'advanced', address_book: 'no' } as const;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// The dialog opens one tick after the call starts: after the queue turn and the approval chain.
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/** Runs a device attempt whose dialog the user cancels, and that the device then rejects. */
const cancelledAttempt = async (attempt: () => Promise<unknown>) => {
  const signing = deferred<bigint>();
  mocks.deviceLedger.transfer.mockReturnValueOnce(signing.promise);
  let run!: Promise<unknown>;
  act(() => {
    run = attempt();
  });
  await flush();
  act(() => cancelPendingDeviceAction());
  await act(async () => {
    signing.reject(new LedgerDeviceError(LedgerErrorCode.UserRejected));
    await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);
  });
};

describe('useSendIcp', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearDeviceApprovals();
    mocks.getIcpLedgerCanister.mockResolvedValue(mocks.deviceLedger);
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
    const { runApprovedDeviceCall } = await vi.importActual<
      typeof import('@common/ledger/approvedDeviceCall')
    >('@common/ledger/approvedDeviceCall');
    mocks.runApprovedDeviceCall.mockImplementation(runApprovedDeviceCall);
    mocks.iiLedger.transfer.mockResolvedValue(1n);
    mocks.iiLedger.icrc1Transfer.mockResolvedValue(2n);
    mocks.deviceLedger.transfer.mockResolvedValue(3n);
    mocks.deviceLedger.icrc1Transfer.mockResolvedValue(4n);
  });

  it('sends to an ICP address with the session by default', async () => {
    const { result } = renderSendIcp();

    await act(() =>
      result.current.mutateAsync({
        toAccount: ICP_ADDRESS,
        amount: '2.5',
        fromSubAccount: [1],
        memo: '7',
        analytics: analyticsParams,
      }),
    );

    expect(mocks.iiLedger.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: AccountIdentifier.fromHex(ICP_ADDRESS),
        amount: 250_000_000n,
        fromSubAccount: [1],
        memo: 7n,
      }),
    );
    expect(mocks.runApprovedDeviceCall).not.toHaveBeenCalled();
    expect(mocks.getIcpLedgerCanister).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledTimes(1);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('account_send_icp', {
      variant: 'advanced',
      address_book: 'no',
      destination: 'icp',
      amount_range: '1-10',
    });
  });

  it('sends to an ICRC-1 account with the session', async () => {
    const { result } = renderSendIcp();

    await act(() =>
      result.current.mutateAsync({
        toAccount: ICRC_ADDRESS,
        amount: '1',
        analytics: analyticsParams,
      }),
    );

    expect(mocks.iiLedger.icrc1Transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { owner: Principal.fromText(ICRC_ADDRESS), subaccount: [] },
        amount: 100_000_000n,
      }),
    );
  });

  it('signs with the device behind the approval dialog, with the amount and the destination to check', async () => {
    const { result } = renderSendIcp();

    await act(() =>
      result.current.mutateAsync({
        toAccount: ICP_ADDRESS,
        amount: '2.5',
        signer: DEVICE_SIGNER,
        analytics: analyticsParams,
      }),
    );

    expect(mocks.getIcpLedgerCanister).toHaveBeenCalledWith({ signer: DEVICE_SIGNER });
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ to: AccountIdentifier.fromHex(ICP_ADDRESS), amount: 250_000_000n }),
    );
    expect(mocks.iiLedger.transfer).not.toHaveBeenCalled();
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE_PRINCIPAL, expect.any(Function));

    const [principal, , options] = mocks.runApprovedDeviceCall.mock.calls[0];
    expect(principal).toBe(DEVICE_PRINCIPAL);
    expect(options.description).toBe(
      'Check the destination and the amount on the device screen and approve the transfer.',
    );
    render(<>{options.detail}</>);
    expect(screen.getByText('2.5 ICP')).toBeTruthy();
    expect(screen.getByText(ICP_ADDRESS)).toBeTruthy();

    expect(mocks.analyticsEvent).toHaveBeenCalledWith('account_send_icp', expect.any(Object));
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_send', {
      variant: 'advanced',
      address_book: 'no',
      destination: 'icp',
      amount_range: '1-10',
    });
  });

  it('keeps the createdAt of a cancelled device transfer for the retry', async () => {
    mocks.runApprovedDeviceCall.mockRejectedValueOnce(new DeviceActionCancelledError());
    const { result } = renderSendIcp();
    const params = {
      toAccount: ICP_ADDRESS,
      amount: '1',
      signer: DEVICE_SIGNER,
      analytics: analyticsParams,
    };

    await expect(act(() => result.current.mutateAsync(params))).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_send_error', {
      variant: 'advanced',
      address_book: 'no',
      destination: 'icp',
      reason: 'cancelled',
    });

    await act(() => result.current.mutateAsync(params));
    await act(() => result.current.mutateAsync(params));

    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts).toHaveLength(2);
    // The retry reuses the createdAt of the cancelled attempt; a success starts a new one.
    expect(createdAts[0]).not.toBe(createdAts[1]);
  });

  it('counts a duplicate device transfer as the done payment, with no new createdAt', async () => {
    mocks.deviceLedger.transfer.mockRejectedValueOnce(new TxDuplicateError(7n));
    mocks.deviceLedger.icrc1Transfer.mockRejectedValueOnce(
      new IcrcTransferError({ errorType: { Duplicate: { duplicate_of: 8n } } }),
    );
    const { result } = renderSendIcp();

    const icp = await act(() =>
      result.current.mutateAsync({
        toAccount: ICP_ADDRESS,
        amount: '1',
        signer: DEVICE_SIGNER,
        analytics: analyticsParams,
      }),
    );
    const icrc = await act(() =>
      result.current.mutateAsync({
        toAccount: ICRC_ADDRESS,
        amount: '1',
        signer: DEVICE_SIGNER,
        analytics: analyticsParams,
      }),
    );

    expect(icp).toBe(7n);
    expect(icrc).toBe(8n);
    expect(mocks.analyticsEvent).not.toHaveBeenCalledWith(
      'ledger_device_send_error',
      expect.anything(),
    );
  });

  it('keeps the createdAt of a cancelled device transfer across a dialog reset or a remount', async () => {
    const params = {
      toAccount: ICP_ADDRESS,
      amount: '3',
      signer: DEVICE_SIGNER,
      analytics: analyticsParams,
    };
    const first = renderSendIcp();
    await cancelledAttempt(() => first.result.current.mutateAsync(params));
    first.result.current.resetCreatedAt();
    first.unmount();

    // The same payment from a new dialog is the same ledger transaction.
    const second = renderSendIcp();
    await act(() => second.result.current.mutateAsync(params));
    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts).toHaveLength(2);
    expect(createdAts[0]).toBe(createdAts[1]);

    // A done payment starts a new transaction next time.
    await act(() => second.result.current.mutateAsync(params));
    expect(mocks.deviceLedger.transfer.mock.calls[2][0].createdAt).not.toBe(createdAts[0]);
  });

  it('keys a device transfer by the values the ledger sees, not by the typed text', async () => {
    const { result } = renderSendIcp();
    const base = { toAccount: ICP_ADDRESS, signer: DEVICE_SIGNER, analytics: analyticsParams };

    await cancelledAttempt(() => result.current.mutateAsync({ ...base, amount: '4', memo: '7' }));
    await act(() => result.current.mutateAsync({ ...base, amount: '4.0', memo: '007' }));

    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts).toHaveLength(2);
    expect(createdAts[0]).toBe(createdAts[1]);
  });

  it('keys an ICP payment the same with the account in upper case and with no memo or "0"', async () => {
    const { result } = renderSendIcp();
    const base = { amount: '6', signer: DEVICE_SIGNER, analytics: analyticsParams };

    await cancelledAttempt(() => result.current.mutateAsync({ ...base, toAccount: ICP_ADDRESS }));
    await act(() =>
      result.current.mutateAsync({ ...base, toAccount: ICP_ADDRESS.toUpperCase(), memo: '0' }),
    );

    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts).toHaveLength(2);
    expect(createdAts[0]).toBe(createdAts[1]);
  });

  it('forgets the createdAt of a device transfer that the ICRC-1 ledger rejected', async () => {
    mocks.deviceLedger.icrc1Transfer.mockRejectedValueOnce(
      new IcrcTransferError({ errorType: { TooOld: null } }),
    );
    const { result } = renderSendIcp();
    const params = {
      toAccount: ICRC_ADDRESS,
      amount: '5',
      signer: DEVICE_SIGNER,
      analytics: analyticsParams,
    };

    await expect(act(() => result.current.mutateAsync(params))).rejects.toBeInstanceOf(
      IcrcTransferError,
    );
    await act(() => result.current.mutateAsync(params));

    const createdAts = mocks.deviceLedger.icrc1Transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts[0]).not.toBe(createdAts[1]);
  });

  it('opens the approval dialog only at the queue turn of the device', async () => {
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementationOnce(
      async (_principal: string, call: () => Promise<unknown>) => {
        await turn.promise;
        return call();
      },
    );
    const { result } = renderSendIcp();

    let send!: Promise<bigint>;
    act(() => {
      send = result.current.mutateAsync({
        toAccount: ICP_ADDRESS,
        amount: '1',
        signer: DEVICE_SIGNER,
        analytics: analyticsParams,
      });
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
      'Check the destination and the amount on the device screen and approve the transfer.',
    );
    expect(mocks.deviceLedger.transfer).toHaveBeenCalledTimes(1);

    await act(async () => {
      signing.resolve(9n);
      await expect(send).resolves.toBe(9n);
    });
    expect(result.current.pending).toBeNull();
  });

  it('does not ask for a signature when the dialog was cancelled during the device connection', async () => {
    mocks.getIcpLedgerCanister.mockImplementationOnce(async () => {
      cancelPendingDeviceAction();
      return mocks.deviceLedger;
    });
    const { result } = renderSendIcp();

    await expect(
      act(() =>
        result.current.mutateAsync({
          toAccount: ICP_ADDRESS,
          amount: '1',
          signer: DEVICE_SIGNER,
          analytics: analyticsParams,
        }),
      ),
    ).rejects.toBeInstanceOf(DeviceActionCancelledError);

    expect(mocks.deviceLedger.transfer).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_send_error', {
      variant: 'advanced',
      address_book: 'no',
      destination: 'icp',
      reason: 'cancelled',
    });
  });

  it('resolves with the transfer when the device signs after a cancelled dialog', async () => {
    const signing = deferred<bigint>();
    mocks.deviceLedger.transfer.mockReturnValueOnce(signing.promise);
    const { result } = renderSendIcp();
    const params = {
      toAccount: ICP_ADDRESS,
      amount: '1',
      signer: DEVICE_SIGNER,
      analytics: analyticsParams,
    };

    let send!: Promise<bigint>;
    act(() => {
      send = result.current.mutateAsync(params);
    });
    await flush();
    act(() => cancelPendingDeviceAction());
    expect(result.current.pending).toBeNull();

    await act(async () => {
      signing.resolve(5n);
      await expect(send).resolves.toBe(5n);
    });
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_send', expect.any(Object));

    // The payment is done: the same payment next time is a new transaction.
    await act(() => result.current.mutateAsync(params));
    const createdAts = mocks.deviceLedger.transfer.mock.calls.map(([args]) => args.createdAt);
    expect(createdAts[0]).not.toBe(createdAts[1]);
  });
});
