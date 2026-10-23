import '@/i18n/config';

import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MockLedgerIdentity } from '../../../../tests/mocks/ledgerIdentity';
import { AddLedgerDeviceDialog } from './AddLedgerDeviceDialog';

const mocks = vi.hoisted(() => ({
  connectLedgerIdentity: vi.fn(),
  addAccount: vi.fn(),
  registerHardwareWallet: vi.fn(),
  errorNotification: vi.fn(),
  analyticsEvent: vi.fn(),
}));

vi.mock('@common/ledger/session', () => ({
  connectLedgerIdentity: mocks.connectLedgerIdentity,
}));
vi.mock('@hooks/nnsDapp/useNnsDapp', () => ({
  useNnsDapp: () => ({
    ready: true,
    authenticated: true,
    canister: {
      certifiedService: {
        add_account: mocks.addAccount,
        register_hardware_wallet: mocks.registerHardwareWallet,
      },
    },
  }),
}));
vi.mock('@utils/notification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/notification')>()),
  errorNotification: mocks.errorNotification,
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: mocks.analyticsEvent } }));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));

const identity = new MockLedgerIdentity();
const principal = identity.getPrincipal();

const renderDialog = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AddLedgerDeviceDialog trigger={(open) => <button onClick={open}>Add</button>} />
    </QueryClientProvider>,
  );

const openAndConnect = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText('Add'));
  await user.click(screen.getByRole('button', { name: 'Connect' }));
};

describe('AddLedgerDeviceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectLedgerIdentity.mockResolvedValue(identity);
    mocks.addAccount.mockResolvedValue('');
    mocks.registerHardwareWallet.mockResolvedValue({ Ok: null });
  });

  it('shows the principal and the account identifier after the connection', async () => {
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);

    const details = await screen.findByTestId('ledger-device-details');
    expect(details.textContent).toContain(principal.toText());
    expect(details.textContent).toContain(AccountIdentifier.fromPrincipal({ principal }).toHex());
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_connect');
  });

  it('registers the device with the name and the device principal', async () => {
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);
    await user.click(await screen.findByRole('button', { name: 'Next' }));

    const register = screen.getByRole('button', { name: 'Register' });
    expect(register).toHaveProperty('disabled', true);

    await user.type(screen.getByLabelText('Device name'), ' Nano X ');
    expect(register).toHaveProperty('disabled', false);
    await user.click(register);

    await waitFor(() =>
      expect(mocks.registerHardwareWallet).toHaveBeenCalledWith({ name: 'Nano X', principal }),
    );
    expect(mocks.addAccount).toHaveBeenCalled();
    // The message is rendered twice: once as the screen reader title, once as the visible text.
    expect(await screen.findAllByText('"Nano X" registered.')).toHaveLength(2);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_register');
  });

  it('keeps Register disabled for a one-character name', async () => {
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Device name'), 'N');

    expect(screen.getByRole('button', { name: 'Register' })).toHaveProperty('disabled', true);
  });

  it('rejects a name above 24 UTF-8 bytes', async () => {
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Device name'), 'é'.repeat(13));

    expect(screen.getByTestId('ledger-device-name-error')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Register' })).toHaveProperty('disabled', true);

    await user.type(screen.getByLabelText('Device name'), '{Backspace}');
    expect(screen.queryByTestId('ledger-device-name-error')).toBeNull();
    expect(screen.getByRole('button', { name: 'Register' })).toHaveProperty('disabled', false);
  });

  it('shows the mapped error of the canister response', async () => {
    mocks.registerHardwareWallet.mockResolvedValue({ HardwareWalletAlreadyRegistered: null });
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Device name'), 'Nano X');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findAllByText('This Ledger device is already registered.')).toHaveLength(2);
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_register_error', {
      reason: 'hardware_wallet_already_registered',
    });
  });

  it('shows a toast with the device error when the connection fails', async () => {
    const { LedgerDeviceError, LedgerErrorCode } = await import('@common/ledger/errors');
    mocks.connectLedgerIdentity.mockRejectedValue(
      new LedgerDeviceError(LedgerErrorCode.AppNotOpen),
    );
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);

    await waitFor(() =>
      expect(mocks.errorNotification).toHaveBeenCalledWith({
        title: 'Ledger device',
        description: 'Open the Internet Computer app on the device.',
      }),
    );
    expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_connect_error', {
      reason: 'ledger_app_not_open',
    });
    expect(screen.getByRole('button', { name: 'Connect' })).toBeTruthy();
  });

  it('ignores a connection from a closed opening of the dialog', async () => {
    let finish!: () => void;
    mocks.connectLedgerIdentity.mockImplementationOnce(
      () => new Promise((resolve) => (finish = () => resolve(identity))),
    );
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByText('Add'));

    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Connect' })).toBeTruthy());
    expect(screen.queryByTestId('ledger-device-details')).toBeNull();
  });

  it('aborts a pending connection when the dialog closes, without a toast', async () => {
    let signal!: AbortSignal;
    mocks.connectLedgerIdentity.mockImplementationOnce(
      (s: AbortSignal) =>
        new Promise((_, reject) => {
          signal = s;
          s.addEventListener('abort', () => reject(s.reason));
        }),
    );
    const user = userEvent.setup({ delay: null });
    renderDialog();

    await openAndConnect(user);
    expect(signal.aborted).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(signal.aborted).toBe(true);
    await waitFor(() =>
      expect(mocks.analyticsEvent).toHaveBeenCalledWith('ledger_device_connect_error', {
        reason: 'cancelled',
      }),
    );
    expect(mocks.errorNotification).not.toHaveBeenCalled();
  });
});
