import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { E8S } from '@constants/extra';
import { renderWithProviders } from '@utils/unitTest';
import { mockNeuron } from '@fixtures/neuron';

import { DisburseMaturityModal } from './DisburseMaturityModal';

// ─── Module mocks ────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  useAccountSelection: vi.fn(),
  useAccounts: vi.fn(),
  useAddressBook: vi.fn(),
}));

// The modal renders inside MutationDialog's NavigationBlockerDialog, which calls useBlocker.
// Stub just the blocker so we don't need a RouterProvider; keep the rest of the module real.
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useBlocker: () => ({ status: 'idle', proceed: vi.fn(), reset: vi.fn() }),
}));

// Force the desktop (Radix Dialog) branch of ResponsiveDialog; the mobile branch uses vaul,
// whose pointer handling throws under jsdom.
vi.mock('@hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

vi.mock('../hooks/useDisburseMaturity', () => ({
  useDisburseMaturity: () => ({ mutateAsync: mocks.mutateAsync }),
}));

vi.mock('@features/accounts/hooks/useAccountSelection', () => ({
  useAccountSelection: mocks.useAccountSelection,
}));

vi.mock('@features/accounts/hooks/useAccounts', () => ({
  useAccounts: mocks.useAccounts,
}));

vi.mock('@hooks/addressBook/useAddressBook', () => ({
  useAddressBook: mocks.useAddressBook,
}));

// Stub the pickers — the modal's own wiring is under test, not the child components.
vi.mock('@features/accounts/components/AccountSelect', () => ({
  AccountSelect: () => <div data-testid="disburse-maturity-account-select" />,
}));

vi.mock('@features/addressBook/components/AddressBookSelect', () => ({
  AddressBookSelect: ({
    selectedName,
    onSelect,
  }: {
    selectedName: string;
    onSelect: (name: string) => void;
  }) => (
    <button type="button" data-testid="stub-address-book-select" onClick={() => onSelect('Alice')}>
      {selectedName || 'no selection'}
    </button>
  ),
}));

// ─── Fixtures ────────────────────────────────────────────────────

const MAIN_ACCOUNT_ID = 'main-account-id';

const neuronWithMaturity = (): NeuronInfo =>
  mockNeuron({ fullNeuron: { maturityE8sEquivalent: BigInt(2 * E8S) } });

const setAccounts = () =>
  mocks.useAccounts.mockReturnValue({
    data: {
      accounts: [
        {
          name: 'Main',
          accountId: MAIN_ACCOUNT_ID,
          type: 'main',
          status: 'ready',
          balanceE8s: BigInt(5 * E8S),
        },
      ],
      mainAccountId: MAIN_ACCOUNT_ID,
      totalBalanceE8s: 0n,
      hasSubaccounts: false,
    },
  });

const setAccountSelection = (subaccountsEnabled: boolean) =>
  mocks.useAccountSelection.mockReturnValue({
    selectedAccountId: undefined,
    setSelectedAccountId: vi.fn(),
    resolvedAccountId: 'resolved-account-id',
    subaccountsEnabled,
  });

const withEntries = { name: 'Alice', address: { Icp: 'alice-icp-account' } };

const setAddressBook = ({
  isLoading = false,
  hasEntries = true,
}: { isLoading?: boolean; hasEntries?: boolean } = {}) =>
  mocks.useAddressBook.mockReturnValue({
    isLoading,
    data: { response: { named_addresses: hasEntries ? [withEntries] : [] } },
  });

const renderModal = () =>
  renderWithProviders(
    <DisburseMaturityModal neuron={neuronWithMaturity()} isOpen onOpenChange={vi.fn()} />,
  );

describe('DisburseMaturityModal', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockClear();
    setAccounts();
    setAccountSelection(false);
    setAddressBook();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the noDestination error when the address book is toggled on but no entry is picked', async () => {
    setAccountSelection(true);
    renderModal();

    await userEvent.click(screen.getByTestId('disburse-maturity-address-book-toggle'));
    await userEvent.click(screen.getByRole('button', { name: /disburse/i }));

    const error = await screen.findByTestId('disburse-maturity-amount-error');
    expect(error.textContent).toContain('Pick a destination address from your address book.');
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows the read-only main-account field when the address book is off and subaccounts are disabled', () => {
    setAccountSelection(false);
    renderModal();

    const mainAccount = screen.getByTestId('disburse-maturity-main-account');
    expect(mainAccount.textContent).toContain('Main');
    expect(screen.queryByTestId('disburse-maturity-account-select')).toBeFalsy();
  });

  it('disables the Disburse button while the address book query is loading', () => {
    setAddressBook({ isLoading: true });
    renderModal();

    const disburseButton = screen.getByRole('button', { name: /disburse/i }) as HTMLButtonElement;
    expect(disburseButton.disabled).toBe(true);
  });
});
