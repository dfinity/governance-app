import '@/i18n/config';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@utils/unitTest';
import { mockNeuron } from '@fixtures/neuron';
import { II_SIGNER } from '@common/ledger/signer';

import { DisburseMaturityModal } from './DisburseMaturityModal';

// jsdom has no layout, so the active option scroll is a no-op here.
Element.prototype.scrollIntoView = vi.fn();

const ids = vi.hoisted(() => ({
  MAIN_ACCOUNT_ID: 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f',
  DEVICE_ACCOUNT_ID: 'c42a00e37f88efa2678f131b2661cf1b9b826d4620cac331394ac6da9541a5b1',
}));

const accounts = vi.hoisted(() => [
  {
    name: 'Main',
    accountId: ids.MAIN_ACCOUNT_ID,
    type: 'main',
    status: 'ready',
    balanceE8s: 1_000_000_000n,
  },
  {
    name: 'Nano X',
    accountId: ids.DEVICE_ACCOUNT_ID,
    type: 'hardwareWallet',
    principal: 'aaaaa-aa',
    status: 'ready',
    balanceE8s: 500_000_000n,
  },
]);

// Only the Ledger flag is on: the device account must still be a destination.
vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({ features: { subaccounts: false, ledgerDevice: true } }),
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
      hasSubaccounts: false,
    },
  }),
}));
vi.mock('@hooks/addressBook/useAddressBook', () => ({
  useAddressBook: () => ({ data: { response: { named_addresses: [] } }, isLoading: false }),
}));
vi.mock('@features/stakes/hooks/useDisburseMaturity', () => ({
  useDisburseMaturity: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@features/stakes/hooks/useNeuronSigner', () => ({
  useNeuronSigner: () => II_SIGNER,
}));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

describe('DisburseMaturityModal destination suggestions', () => {
  it('offers a Ledger device account when only the Ledger feature is on', async () => {
    renderWithProviders(
      <DisburseMaturityModal neuron={mockNeuron()} isOpen onOpenChange={() => {}} />,
    );

    // The main account is the default destination, so the list starts with it cleared.
    await userEvent.click(screen.getByTestId('disburse-maturity-destination-input-clear'));
    await userEvent.click(screen.getByTestId('disburse-maturity-destination-input'));
    const options = screen.getAllByTestId('disburse-maturity-destination-input-option');

    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Main'),
      expect.stringContaining('Nano X'),
    ]);
  });
});
