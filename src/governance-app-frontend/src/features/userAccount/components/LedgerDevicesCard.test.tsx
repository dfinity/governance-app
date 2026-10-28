import '@/i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '@features/accounts/types';
import { PendingDeviceActionDialog } from '@features/ledger/components/PendingDeviceActionDialog';

import { usePendingDeviceAction } from '@hooks/useDeviceAction';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';
import { clearDeviceQueues } from '@common/ledger/deviceQueue';
import { LedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

import { MockLedgerIdentity } from '../../../../tests/mocks/ledgerIdentity';
import { LedgerDevicesCard } from './LedgerDevicesCard';

const mocks = vi.hoisted(() => ({
  hardwareWallets: vi.fn(),
  getLedgerIdentity: vi.fn(),
  successNotification: vi.fn(),
  errorNotification: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@features/accounts/hooks/useHardwareWalletsMetadata', () => ({
  useHardwareWalletsMetadata: mocks.hardwareWallets,
}));
vi.mock('@common/ledger/session', () => ({
  getLedgerIdentity: mocks.getLedgerIdentity,
  connectLedgerIdentity: vi.fn(),
}));
vi.mock('@utils/notification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/notification')>()),
  successNotification: mocks.successNotification,
  errorNotification: mocks.errorNotification,
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));
vi.mock('@hooks/nnsDapp/useNnsDapp', () => ({
  useNnsDapp: () => ({ ready: true, authenticated: true, canister: undefined }),
}));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));

const DEVICE = {
  name: 'Nano X',
  accountId: 'd4685b31',
  type: AccountType.HardwareWallet,
  principal: new MockLedgerIdentity().getPrincipal().toText(),
};

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LedgerDevicesCard />
      <PendingDeviceActionDialog />
    </QueryClientProvider>,
  );

describe('LedgerDevicesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDeviceQueues();
    clearDeviceApprovals();
    mocks.hardwareWallets.mockReturnValue({ data: [DEVICE], isLoading: false, isError: false });
  });

  it('shows a load error with a retry instead of the empty state', async () => {
    const refetch = vi.fn();
    mocks.hardwareWallets.mockReturnValue({ data: [], isLoading: false, isError: true, refetch });
    const user = userEvent.setup({ delay: null });
    renderCard();

    expect(screen.getByText('The Ledger devices could not be loaded.')).toBeTruthy();
    expect(screen.queryByText('No Ledger device is registered yet.')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('lists the registered devices with their principal', () => {
    renderCard();

    expect(screen.getByText('Nano X')).toBeTruthy();
    expect(screen.getByText(DEVICE.principal)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Ledger device' })).toBeTruthy();
  });

  it('announces the loading state to screen readers', () => {
    mocks.hardwareWallets.mockReturnValue({ data: [], isLoading: true, isError: false });
    renderCard();

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('No Ledger device is registered yet.')).toBeNull();
  });

  it('shows the empty state without a device', () => {
    mocks.hardwareWallets.mockReturnValue({ data: [], isLoading: false, isError: false });
    renderCard();

    expect(screen.getByText('No Ledger device is registered yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Verify on device' })).toBeNull();
  });

  it('shows the address on the device and confirms with a toast', async () => {
    const identity = new MockLedgerIdentity();
    const show = vi.spyOn(identity, 'showAddressAndPubKeyOnDevice').mockResolvedValue({
      errorMessage: 'No errors',
      returnCode: 0x9000,
      publicKey: Buffer.alloc(0),
      principal: Buffer.alloc(0),
      address: Buffer.alloc(0),
      principalText: DEVICE.principal,
    });
    mocks.getLedgerIdentity.mockResolvedValue(identity);
    const user = userEvent.setup({ delay: null });
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Verify on device' }));

    await waitFor(() => expect(mocks.successNotification).toHaveBeenCalled());
    expect(mocks.getLedgerIdentity).toHaveBeenCalledWith(DEVICE.principal);
    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
    expect(show).toHaveBeenCalledTimes(1);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_verify');
  });

  it('shows a toast with the device error when the device is another one', async () => {
    mocks.getLedgerIdentity.mockRejectedValue(
      new LedgerDeviceError(LedgerErrorCode.UnexpectedDevice, {
        expected: DEVICE.principal,
        actual: 'aaaaa-aa',
      }),
    );
    const user = userEvent.setup({ delay: null });
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Verify on device' }));

    await waitFor(() => expect(mocks.errorNotification).toHaveBeenCalled());
    expect(mocks.errorNotification.mock.calls[0][0].description).toContain(DEVICE.principal);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_verify_error', {
      reason: 'ledger_unexpected_device',
    });
  });

  it('keeps the verify pending after a cancel until the device answers, and confirms a late approval', async () => {
    const identity = new MockLedgerIdentity();
    let finish!: () => void;
    const show = vi
      .spyOn(identity, 'showAddressAndPubKeyOnDevice')
      .mockImplementation(
        () => new Promise((resolve) => (finish = () => resolve(undefined as never))),
      );
    mocks.getLedgerIdentity.mockResolvedValue(identity);
    const user = userEvent.setup({ delay: null });
    const { result: pending } = renderHook(() => usePendingDeviceAction());
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Verify on device' }));
    await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
    expect(screen.getByText(DEVICE.accountId)).toBeTruthy();

    act(() => pending.current?.cancel());
    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
    // The device still asks for the confirmation: the action stays pending, no second request.
    expect(screen.getByRole('button', { name: 'Verify on device' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(mocks.successNotification).not.toHaveBeenCalled();

    finish();
    await waitFor(() => expect(mocks.successNotification).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Verify on device' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(show).toHaveBeenCalledTimes(1);
    expect(mocks.errorNotification).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_verify');
  });

  it('reports the cancel without a toast when the device rejects the request after it', async () => {
    const identity = new MockLedgerIdentity();
    let fail!: () => void;
    const show = vi
      .spyOn(identity, 'showAddressAndPubKeyOnDevice')
      .mockImplementation(
        () =>
          new Promise(
            (_, reject) =>
              (fail = () => reject(new LedgerDeviceError(LedgerErrorCode.UserRejected))),
          ),
      );
    mocks.getLedgerIdentity.mockResolvedValue(identity);
    const user = userEvent.setup({ delay: null });
    const { result: pending } = renderHook(() => usePendingDeviceAction());
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Verify on device' }));
    await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
    act(() => pending.current?.cancel());

    fail();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Verify on device' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    expect(mocks.successNotification).not.toHaveBeenCalled();
    expect(mocks.errorNotification).not.toHaveBeenCalled();
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_verify_error', {
      reason: 'cancelled',
    });
  });
});
