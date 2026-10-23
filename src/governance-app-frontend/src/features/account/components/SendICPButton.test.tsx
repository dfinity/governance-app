import '@/i18n/config';

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@utils/unitTest';

import { SendICPDialog } from './SendICPButton';

// jsdom has no layout, so the active option scroll is a no-op here.
Element.prototype.scrollIntoView = vi.fn();

const ids = vi.hoisted(() => ({
  MAIN_ACCOUNT_ID: 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f',
  SAVINGS_ACCOUNT_ID: 'c42a00e37f88efa2678f131b2661cf1b9b826d4620cac331394ac6da9541a5b1',
  CONTACT_ADDRESS: 'h4a5i-5vcfo-5rusv-fmb6m-vrkia-mjnkc-jpoow-h5mam-nthnm-ldqlr-bqe',
}));

const state = vi.hoisted(() => ({
  subaccounts: false,
  // A contact that points at the savings account under another name.
  savingsContact: false,
}));

const accounts = vi.hoisted(() => [
  {
    name: 'Main account',
    accountId: ids.MAIN_ACCOUNT_ID,
    type: 'main',
    status: 'ready',
    balanceE8s: 1_000_000_000n,
  },
  {
    name: 'Savings',
    accountId: ids.SAVINGS_ACCOUNT_ID,
    type: 'subaccount',
    subAccount: new Uint8Array(32),
    status: 'ready',
    balanceE8s: 500_000_000n,
  },
]);

vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({
    features: { subaccounts: state.subaccounts, transactionMemo: false },
  }),
}));
vi.mock('@features/accounts/hooks/useMainAccountMetadata', () => ({
  useMainAccountMetadata: () => ({ data: accounts[0], isLoading: false }),
}));
vi.mock('@features/accounts/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: {
      accounts,
      mainAccountId: ids.MAIN_ACCOUNT_ID,
      totalBalanceE8s: 1_500_000_000n,
      hasSubaccounts: true,
    },
  }),
}));
vi.mock('@hooks/addressBook/useAddressBook', () => ({
  useAddressBook: () => ({
    data: {
      response: {
        named_addresses: [
          { name: 'Bob', address: { Icrc1: ids.CONTACT_ADDRESS } },
          ...(state.savingsContact
            ? [{ name: 'Wallet', address: { Icp: ids.SAVINGS_ACCOUNT_ID } }]
            : []),
        ],
      },
    },
    isLoading: false,
  }),
}));
vi.mock('@hooks/icpLedger/useIcpLedger', () => ({
  useIcpLedger: () => ({ canister: undefined, ready: false, authenticated: false }),
}));
vi.mock('@hooks/tickers', () => ({
  useIcpPrice: () => ({
    icpPrice: undefined,
    currency: 'USD',
    formatFiat: (value: number) => `$${value}`,
  }),
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));
vi.mock('@features/addressBook/components/AddAddressModal', () => ({
  AddAddressModal: () => null,
}));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

const renderDialog = () =>
  renderWithProviders(
    <SendICPDialog open onOpenChange={() => {}} balance={10} variant="advanced" />,
  );

const openDestinationList = async () => {
  await userEvent.click(screen.getByTestId('send-icp-destination-input'));
  return screen.getAllByTestId('send-icp-destination-input-option');
};

describe('SendICPDialog destination suggestions', () => {
  beforeEach(() => {
    state.subaccounts = false;
    state.savingsContact = false;
  });

  it('offers only the address book while subaccounts are off', async () => {
    renderDialog();

    const options = await openDestinationList();

    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('Bob')]);
  });

  it('offers the other own accounts before the address book', async () => {
    state.subaccounts = true;
    renderDialog();

    const options = await openDestinationList();

    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain('Savings');
    expect(options[0].textContent).toContain('Account');
    expect(options[1].textContent).toContain('Bob');
  });

  it('leaves out the source account', async () => {
    state.subaccounts = true;
    renderDialog();

    fireEvent.change(screen.getByTestId('send-from-account-select'), {
      target: { value: ids.SAVINGS_ACCOUNT_ID },
    });
    const options = await openDestinationList();

    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain('Main account');
    expect(options[1].textContent).toContain('Bob');
  });

  it('names a picked own account on the confirmation step', async () => {
    state.subaccounts = true;
    renderDialog();

    const options = await openDestinationList();
    await userEvent.click(options[0]);
    expect(screen.getByTestId('send-icp-destination-input-selected').textContent).toContain(
      'Savings',
    );

    await userEvent.type(screen.getByTestId('send-icp-amount-input'), '1');
    await userEvent.click(screen.getByTestId('send-icp-next-btn'));

    // The confirmation step mounts after the exit animation of the form.
    const name = await screen.findByTestId('send-icp-destination-name');
    expect(name.textContent).toBe('Savings');
    expect(screen.queryByTestId('send-icp-save-address-btn')).toBeNull();
  });

  it('keeps the name of a picked own account over a contact with the same address', async () => {
    state.subaccounts = true;
    state.savingsContact = true;
    renderDialog();

    const options = await openDestinationList();
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Savings'),
      expect.stringContaining('Bob'),
      expect.stringContaining('Wallet'),
    ]);
    await userEvent.click(options[0]);
    await userEvent.type(screen.getByTestId('send-icp-amount-input'), '1');
    await userEvent.click(screen.getByTestId('send-icp-next-btn'));

    const name = await screen.findByTestId('send-icp-destination-name');
    expect(name.textContent).toBe('Savings');
  });
});
