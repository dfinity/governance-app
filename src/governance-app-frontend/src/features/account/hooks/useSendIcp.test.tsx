import '@/i18n/config';

import { AccountIdentifier, TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';
import { IcrcTransferError } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceActionCancelledError } from '@hooks/useDeviceAction';

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
  runDeviceAction: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@common/canisters', () => ({ getIcpLedgerCanister: mocks.getIcpLedgerCanister }));
// A clock that moves on every call, so two attempts never share a createdAt by accident.
let clock = 0;
vi.mock('@dfinity/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dfinity/utils')>()),
  nowInBigIntNanoSeconds: () => BigInt(++clock),
}));
vi.mock('@common/ledger/deviceQueue', () => ({ runOnDevice: mocks.runOnDevice }));
vi.mock('@hooks/useDeviceAction', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/useDeviceAction')>()),
  useDeviceAction: () => mocks.runDeviceAction,
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

  return renderHook(() => useSendIcp(), { wrapper });
};

const analyticsParams = { variant: 'advanced', address_book: 'no' } as const;

describe('useSendIcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIcpLedgerCanister.mockResolvedValue(mocks.deviceLedger);
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
    mocks.runDeviceAction.mockImplementation((action: (signal: AbortSignal) => Promise<unknown>) =>
      action(new AbortController().signal),
    );
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
    expect(mocks.runDeviceAction).not.toHaveBeenCalled();
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

    const [, options] = mocks.runDeviceAction.mock.calls[0];
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
    mocks.runDeviceAction.mockRejectedValueOnce(new DeviceActionCancelledError());
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
    mocks.runDeviceAction.mockImplementationOnce(
      async (action: (signal: AbortSignal) => Promise<unknown>) => {
        // The user cancels the dialog, the device signs anyway.
        await action(new AbortController().signal);
        throw new DeviceActionCancelledError();
      },
    );
    const params = {
      toAccount: ICP_ADDRESS,
      amount: '3',
      signer: DEVICE_SIGNER,
      analytics: analyticsParams,
    };
    const first = renderSendIcp();
    await expect(act(() => first.result.current.mutateAsync(params))).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );
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
    mocks.runDeviceAction.mockImplementationOnce(
      async (action: (signal: AbortSignal) => Promise<unknown>) => {
        await action(new AbortController().signal);
        throw new DeviceActionCancelledError();
      },
    );
    const { result } = renderSendIcp();
    const base = { toAccount: ICP_ADDRESS, signer: DEVICE_SIGNER, analytics: analyticsParams };

    await expect(
      act(() => result.current.mutateAsync({ ...base, amount: '4', memo: '7' })),
    ).rejects.toBeInstanceOf(DeviceActionCancelledError);
    await act(() => result.current.mutateAsync({ ...base, amount: '4.0', memo: '007' }));

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

  it('does not prompt the device for a call that was cancelled while it waited in the queue', async () => {
    const controller = new AbortController();
    controller.abort();
    mocks.runDeviceAction.mockImplementationOnce(
      async (action: (signal: AbortSignal) => Promise<unknown>) => {
        await action(controller.signal);
        throw new DeviceActionCancelledError();
      },
    );
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
  });
});
