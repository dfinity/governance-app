import '@/i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PendingDeviceActionDialog } from '@features/ledger/components/PendingDeviceActionDialog';

import { E8S } from '@constants/extra';
import { mockNeuron } from '@fixtures/neuron';
import { clearDeviceApprovals } from '@common/ledger/approvedDeviceCall';
import { clearDeviceQueues } from '@common/ledger/deviceQueue';
import { LedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

import { type Account, AccountType } from '../types';
import { LedgerNeuronsDialog } from './LedgerNeuronsDialog';

const II_PRINCIPAL = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
const DEVICE_PRINCIPAL = 'aaaaa-aa';

const mocks = vi.hoisted(() => ({
  listNeurons: vi.fn(),
  addHotkey: vi.fn(),
  getNnsGovernanceCanister: vi.fn(),
  successNotification: vi.fn(),
  errorNotification: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getNnsGovernanceCanister: mocks.getNnsGovernanceCanister,
}));
vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => II_PRINCIPAL }) },
  }),
}));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('@utils/notification', () => ({
  successNotification: mocks.successNotification,
  errorNotification: mocks.errorNotification,
}));

const account: Account = {
  name: 'Nano X',
  accountId: 'device-account',
  type: AccountType.HardwareWallet,
  principal: DEVICE_PRINCIPAL,
  status: 'ready',
  balanceE8s: 0n,
};

const deviceNeuron = (neuronId: bigint, hotKeys: string[] = []) =>
  mockNeuron({
    neuronId,
    dissolveDelaySeconds: 15_778_800n,
    fullNeuron: {
      id: neuronId,
      controller: DEVICE_PRINCIPAL,
      hotKeys,
      cachedNeuronStake: BigInt(1000 * E8S),
      dissolveState: { DissolveDelaySeconds: 15_778_800n },
    },
  });

const renderDialog = () => {
  const queryClient = new QueryClient();
  // The approval dialog is mounted once in the authenticated layout.
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <PendingDeviceActionDialog />
    </QueryClientProvider>
  );

  return render(<LedgerNeuronsDialog account={account} open onOpenChange={vi.fn()} />, {
    wrapper,
  });
};

describe('LedgerNeuronsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDeviceQueues();
    clearDeviceApprovals();
    mocks.getNnsGovernanceCanister.mockResolvedValue({
      listNeurons: mocks.listNeurons,
      addHotkey: mocks.addHotkey,
    });
    mocks.addHotkey.mockResolvedValue(undefined);
  });

  it('shows the connecting state while the device signs list_neurons', () => {
    mocks.listNeurons.mockReturnValue(new Promise(() => {}));

    renderDialog();

    expect(screen.getByTestId('ledger-neurons-connecting')).toBeTruthy();
  });

  it('lists the neurons with the device as signer', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n), deviceNeuron(2n, [II_PRINCIPAL])]);

    renderDialog();

    await waitFor(() => expect(screen.getAllByTestId('ledger-neuron-row')).toHaveLength(2));
    expect(mocks.getNnsGovernanceCanister).toHaveBeenCalledWith({
      signer: { kind: 'ledger', principal: DEVICE_PRINCIPAL },
    });
    expect(mocks.listNeurons).toHaveBeenCalledWith({
      certified: true,
      includeEmptyNeurons: undefined,
    });
    expect(screen.getAllByTestId('ledger-neuron-add-hotkey')).toHaveLength(1);
    expect(screen.getAllByTestId('ledger-neuron-hotkey-added')).toHaveLength(1);
  });

  it('shows the empty state when the device controls no neurons', async () => {
    mocks.listNeurons.mockResolvedValue([]);

    renderDialog();

    expect(await screen.findByTestId('ledger-neurons-empty')).toBeTruthy();
  });

  it('adds the Internet Identity principal as hotkey with the device and marks the neuron done', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n)]);
    const user = userEvent.setup();

    renderDialog();

    await user.click(await screen.findByTestId('ledger-neuron-add-hotkey'));

    await waitFor(() =>
      expect(mocks.addHotkey).toHaveBeenCalledWith({
        neuronId: 1n,
        principal: expect.objectContaining({}),
      }),
    );
    expect(mocks.getNnsGovernanceCanister).toHaveBeenLastCalledWith({
      signer: { kind: 'ledger', principal: DEVICE_PRINCIPAL },
    });
    expect(await screen.findByTestId('ledger-neuron-hotkey-added')).toBeTruthy();
    expect(screen.queryByTestId('ledger-neuron-add-hotkey')).toBeNull();
    expect(mocks.successNotification).toHaveBeenCalled();
  });

  it('shows the approval dialog while the device signs the hotkey', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n)]);
    mocks.addHotkey.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderDialog();

    await user.click(await screen.findByTestId('ledger-neuron-add-hotkey'));

    expect(await screen.findByTestId('device-approval-dialog')).toBeTruthy();
    expect(screen.getByTestId('device-approval-detail').textContent).toBe(II_PRINCIPAL);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('device-approval-dialog')).toBeNull());
    // The device call is still pending, so the button waits for it.
    expect(screen.getByTestId('ledger-neuron-add-hotkey').hasAttribute('disabled')).toBe(true);
  });

  it('keeps the result and reports the success when the device signs after a cancel', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n)]);
    let settle: () => void = () => {};
    mocks.addHotkey.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
    const user = userEvent.setup();

    renderDialog();

    await user.click(await screen.findByTestId('ledger-neuron-add-hotkey'));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    settle();

    expect(await screen.findByTestId('ledger-neuron-hotkey-added')).toBeTruthy();
    expect(mocks.successNotification).toHaveBeenCalledTimes(1);
  });

  it('reports nothing when the device rejects the request after a cancel', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n)]);
    let reject: (error: unknown) => void = () => {};
    mocks.addHotkey.mockReturnValue(new Promise<void>((_, rej) => (reject = rej)));
    const user = userEvent.setup();

    renderDialog();

    await user.click(await screen.findByTestId('ledger-neuron-add-hotkey'));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    reject(new LedgerDeviceError(LedgerErrorCode.UserRejected));

    await waitFor(() =>
      expect(screen.getByTestId('ledger-neuron-add-hotkey').hasAttribute('disabled')).toBe(false),
    );
    expect(mocks.errorNotification).not.toHaveBeenCalled();
    expect(mocks.successNotification).not.toHaveBeenCalled();
  });

  it('holds the hotkey of another neuron until the cancelled call settles', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n), deviceNeuron(2n)]);
    let settleFirst: () => void = () => {};
    mocks.addHotkey
      .mockReturnValueOnce(new Promise<void>((resolve) => (settleFirst = resolve)))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderDialog();

    const buttons = await screen.findAllByTestId('ledger-neuron-add-hotkey');
    await user.click(buttons[0]);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await user.click(buttons[1]);
    await waitFor(() => expect(buttons[1].hasAttribute('disabled')).toBe(true));

    expect(mocks.addHotkey).toHaveBeenCalledTimes(1);

    settleFirst();

    await waitFor(() => expect(mocks.addHotkey).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getAllByTestId('ledger-neuron-hotkey-added')).toHaveLength(2),
    );
  });

  it('holds a reopen until the pending list_neurons settles', async () => {
    let settleFirst: (neurons: unknown[]) => void = () => {};
    mocks.listNeurons
      .mockReturnValueOnce(new Promise<unknown[]>((resolve) => (settleFirst = resolve)))
      .mockResolvedValueOnce([deviceNeuron(1n)]);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { rerender } = render(
      <LedgerNeuronsDialog account={account} open onOpenChange={vi.fn()} />,
      { wrapper },
    );
    await waitFor(() => expect(mocks.listNeurons).toHaveBeenCalledTimes(1));

    rerender(<LedgerNeuronsDialog account={account} open={false} onOpenChange={vi.fn()} />);
    rerender(<LedgerNeuronsDialog account={account} open onOpenChange={vi.fn()} />);
    await screen.findByTestId('ledger-neurons-connecting');

    expect(mocks.listNeurons).toHaveBeenCalledTimes(1);

    settleFirst([]);

    await waitFor(() => expect(mocks.listNeurons).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('ledger-neurons-list')).toBeTruthy();
  });

  it('asks the device again on each open', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n)]);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { rerender } = render(
      <LedgerNeuronsDialog account={account} open onOpenChange={vi.fn()} />,
      { wrapper },
    );
    await screen.findByTestId('ledger-neurons-list');

    rerender(<LedgerNeuronsDialog account={account} open={false} onOpenChange={vi.fn()} />);
    rerender(<LedgerNeuronsDialog account={account} open onOpenChange={vi.fn()} />);

    await waitFor(() => expect(mocks.listNeurons).toHaveBeenCalledTimes(2));
  });

  it('reports a device error for the hotkey and keeps the button', async () => {
    mocks.listNeurons.mockResolvedValue([deviceNeuron(1n)]);
    mocks.addHotkey.mockRejectedValue(new LedgerDeviceError(LedgerErrorCode.UserRejected));
    const user = userEvent.setup();

    renderDialog();

    await user.click(await screen.findByTestId('ledger-neuron-add-hotkey'));

    await waitFor(() =>
      expect(mocks.errorNotification).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'You rejected the request on the device.' }),
      ),
    );
    expect(screen.getByTestId('ledger-neuron-add-hotkey').hasAttribute('disabled')).toBe(false);
  });

  it('shows the device error with a retry when list_neurons fails', async () => {
    mocks.listNeurons
      .mockRejectedValueOnce(new LedgerDeviceError(LedgerErrorCode.AppNotOpen))
      .mockResolvedValueOnce([deviceNeuron(1n)]);
    const user = userEvent.setup();

    renderDialog();

    expect((await screen.findByTestId('ledger-neurons-error')).textContent).toContain(
      'Open the Internet Computer app on the device.',
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByTestId('ledger-neurons-list')).toBeTruthy();
  });
});
