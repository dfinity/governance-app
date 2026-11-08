import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AccountMetadata, AccountType } from '@features/accounts/types';

import { LedgerNeuronsSection } from './LedgerNeuronsSection';

const mocks = vi.hoisted(() => ({
  hardwareWallets: vi.fn(),
  isWebHidSupported: vi.fn(),
}));

vi.mock('@features/accounts/hooks/useHardwareWalletsMetadata', () => ({
  useHardwareWalletsMetadata: mocks.hardwareWallets,
}));
vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: mocks.isWebHidSupported }));
vi.mock('./LedgerNeuronsDialog', () => ({
  LedgerNeuronsDialog: ({ device, open }: { device: AccountMetadata; open: boolean }) =>
    open ? <div data-testid="ledger-neurons-dialog">{device.name}</div> : null,
}));

const device = (name: string, principal: string): AccountMetadata => ({
  name,
  principal,
  accountId: `${name}-account`,
  type: AccountType.HardwareWallet,
});

describe('LedgerNeuronsSection', () => {
  beforeEach(() => {
    mocks.isWebHidSupported.mockReturnValue(true);
    mocks.hardwareWallets.mockReturnValue({
      data: [device('Nano X', 'aaaaa-aa'), device('Cold storage', 'rrkah-fqaaa-aaaaa-aaaaq-cai')],
    });
  });

  it('shows one row for each Ledger device', () => {
    render(<LedgerNeuronsSection />);

    const rows = screen.getAllByTestId('ledger-show-neurons');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Nano X');
    expect(rows[1].textContent).toContain('Cold storage');
  });

  it('opens the neurons dialog for the device of the row', async () => {
    render(<LedgerNeuronsSection />);

    await userEvent.click(screen.getAllByTestId('ledger-show-neurons')[1]);

    expect(screen.getByTestId('ledger-neurons-dialog').textContent).toContain('Cold storage');
  });

  it('shows nothing without a Ledger device', () => {
    mocks.hardwareWallets.mockReturnValue({ data: [] });

    render(<LedgerNeuronsSection />);

    expect(screen.queryByTestId('ledger-neurons-section')).toBeNull();
  });

  it('shows nothing in a browser without WebHID', () => {
    mocks.isWebHidSupported.mockReturnValue(false);

    render(<LedgerNeuronsSection />);

    expect(screen.queryByTestId('ledger-neurons-section')).toBeNull();
  });
});
