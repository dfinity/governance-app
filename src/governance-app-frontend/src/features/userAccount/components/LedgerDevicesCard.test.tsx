import '@/i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '@features/accounts/types';

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
vi.mock('@common/ledger/deviceQueue', () => ({
  runOnDevice: (_principal: string, call: () => Promise<unknown>) => call(),
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
    </QueryClientProvider>,
  );

describe('LedgerDevicesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hardwareWallets.mockReturnValue({ data: [DEVICE], isLoading: false });
  });

  it('lists the registered devices with their principal', () => {
    renderCard();

    expect(screen.getByText('Nano X')).toBeTruthy();
    expect(screen.getByText(DEVICE.principal)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Ledger device' })).toBeTruthy();
  });

  it('shows the empty state without a device', () => {
    mocks.hardwareWallets.mockReturnValue({ data: [], isLoading: false });
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
});
