import '@/i18n/config';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E8S } from '@constants/extra';
import { mockNeuron } from '@fixtures/neuron';
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
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(<LedgerNeuronsDialog account={account} open onOpenChange={vi.fn()} />, {
    wrapper,
  });
};

describe('LedgerNeuronsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('device-approval-dialog')).toBeNull());
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
