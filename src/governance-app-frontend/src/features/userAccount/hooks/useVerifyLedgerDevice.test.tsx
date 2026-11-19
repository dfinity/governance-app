import '@/i18n/config';

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

import { useVerifyLedgerDevice } from './useVerifyLedgerDevice';

const DEVICE_PRINCIPAL = 'aaaaa-aa';
const ACCOUNT_ID = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';

const mocks = vi.hoisted(() => ({
  identity: { showAddressAndPubKeyOnDevice: vi.fn() },
  getLedgerIdentity: vi.fn(),
  runOnDevice: vi.fn(),
  successNotification: vi.fn(),
  errorNotification: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@common/ledger/session', () => ({ getLedgerIdentity: mocks.getLedgerIdentity }));
vi.mock('@common/ledger/deviceQueue', () => ({
  runOnDevice: mocks.runOnDevice,
  getDeviceSessionGeneration: () => 0,
}));
vi.mock('@utils/notification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/notification')>()),
  successNotification: mocks.successNotification,
  errorNotification: mocks.errorNotification,
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));

const renderVerify = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => ({ ...useVerifyLedgerDevice(), pending: usePendingDeviceAction() }), {
    wrapper,
  });
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

const params = { principal: DEVICE_PRINCIPAL, accountId: ACCOUNT_ID };

describe('useVerifyLedgerDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDeviceApprovals();
    mocks.getLedgerIdentity.mockResolvedValue(mocks.identity);
    mocks.identity.showAddressAndPubKeyOnDevice.mockResolvedValue(undefined);
    mocks.runOnDevice.mockImplementation((_principal: string, call: () => Promise<unknown>) =>
      call(),
    );
  });

  it('opens the approval dialog only at the queue turn of the device', async () => {
    const turn = deferred<void>();
    mocks.runOnDevice.mockImplementationOnce(
      async (_principal: string, call: () => Promise<unknown>) => {
        await turn.promise;
        return call();
      },
    );
    const { result } = renderVerify();

    let verify!: Promise<void>;
    act(() => {
      verify = result.current.mutateAsync(params);
    });
    await flush();
    // Another device request is outstanding: no dialog, no device access.
    expect(result.current.pending).toBeNull();
    expect(mocks.getLedgerIdentity).not.toHaveBeenCalled();

    const showing = deferred<void>();
    mocks.identity.showAddressAndPubKeyOnDevice.mockReturnValueOnce(showing.promise);
    await act(async () => {
      turn.resolve();
    });
    await flush();
    expect(mocks.runOnDevice).toHaveBeenCalledWith(DEVICE_PRINCIPAL, expect.any(Function));
    expect(result.current.pending?.description).toBe(
      'Check that the device shows this principal and this address, then approve on the device.',
    );
    render(<>{result.current.pending?.detail}</>);
    // The device shows the address first, then the principal.
    const terms = screen.getAllByRole('term').map((term) => term.textContent);
    expect(terms).toEqual(['Account identifier', 'Principal']);
    const values = screen.getAllByRole('definition').map((value) => value.textContent);
    expect(values).toEqual([ACCOUNT_ID, DEVICE_PRINCIPAL]);
    expect(mocks.identity.showAddressAndPubKeyOnDevice).toHaveBeenCalledTimes(1);

    await act(async () => {
      showing.resolve();
      await verify;
    });
    expect(result.current.pending).toBeNull();
    expect(mocks.successNotification).toHaveBeenCalledTimes(1);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_verify');
  });

  it('does not ask the device when the dialog was cancelled during the connection', async () => {
    mocks.getLedgerIdentity.mockImplementationOnce(async () => {
      cancelPendingDeviceAction();
      return mocks.identity;
    });
    const { result } = renderVerify();

    await expect(act(() => result.current.mutateAsync(params))).rejects.toBeInstanceOf(
      DeviceActionCancelledError,
    );

    expect(mocks.identity.showAddressAndPubKeyOnDevice).not.toHaveBeenCalled();
    expect(mocks.errorNotification).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_verify_error', {
      reason: 'cancelled',
    });
  });
});
