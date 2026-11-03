import '@/i18n/config';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E8Sn } from '@constants/extra';
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
const mutateAsync = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@features/stakes/hooks/useDisburseMaturity', () => ({
  useDisburseMaturity: () => ({ mutateAsync }),
}));
vi.mock('@features/stakes/hooks/useNeuronSigner', () => ({
  useNeuronSigner: () => II_SIGNER,
}));
const maturityModulation = vi.hoisted(() => vi.fn());

vi.mock('@hooks/governance/useGovernanceMaturityModulation', () => ({
  useGovernanceMaturityModulation: maturityModulation,
}));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

const renderDialog = () =>
  renderWithProviders(
    <DisburseMaturityModal
      neuron={mockNeuron({ fullNeuron: { maturityE8sEquivalent: 2n * E8Sn } })}
      isOpen
      onOpenChange={() => {}}
    />,
  );

// The main account is the default destination, so the list opens after a clear.
const openDestinationList = async () => {
  await userEvent.click(screen.getByTestId('disburse-maturity-destination-input-clear'));
  await userEvent.click(screen.getByTestId('disburse-maturity-destination-input'));
  return screen.getAllByTestId('disburse-maturity-destination-input-option');
};

describe('DisburseMaturityModal destination suggestions', () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    maturityModulation.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('offers a Ledger device account when only the Ledger feature is on', async () => {
    renderDialog();

    const options = await openDestinationList();

    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Main'),
      expect.stringContaining('Nano X'),
    ]);
  });

  it('disburses to the picked Ledger device account', async () => {
    renderDialog();

    const options = await openDestinationList();
    await userEvent.click(options[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Disburse' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      neuronId: 1n,
      destination: { kind: 'icp', accountIdentifier: ids.DEVICE_ACCOUNT_ID },
      percentageToDisburse: 100,
      signer: II_SIGNER,
    });
  });
});

describe('DisburseMaturityModal maturity modulation estimate', () => {
  const mockModulation = (currentValuePermyriad: number | undefined) =>
    maturityModulation.mockReturnValue({
      data: {
        certified: false,
        response: { currentValuePermyriad, updatedAtTimestampSeconds: 1_793_404_800n },
      },
      isLoading: false,
    });

  it('shows the ICP estimate at the current modulation', () => {
    mockModulation(-195);
    renderDialog();

    const estimate = screen.getByTestId('disburse-maturity-estimate');
    expect(estimate.textContent).toContain('You get about');
    expect(estimate.textContent).toContain('1.96 ICP');
    expect(estimate.textContent).toContain('Maturity modulation today: −1.95%');
  });

  it('updates the estimate with the selected portion', async () => {
    mockModulation(200);
    renderDialog();

    await userEvent.click(screen.getByTestId('disburse-maturity-preset-50'));

    expect(screen.getByTestId('disburse-maturity-estimate').textContent).toContain('1.02 ICP');
  });

  it('hides the estimate when the modulation is unknown', () => {
    mockModulation(undefined);
    renderDialog();

    expect(screen.queryByTestId('disburse-maturity-estimate')).toBeNull();
  });
});
