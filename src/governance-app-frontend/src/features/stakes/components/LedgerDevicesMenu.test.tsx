import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AccountMetadata, AccountType } from '@features/accounts/types';

import { LedgerDevicesMenu } from './LedgerDevicesMenu';

const mocks = vi.hoisted(() => ({
  hardwareWallets: vi.fn(),
  isWebHidSupported: vi.fn(),
}));

vi.mock('@features/accounts/hooks/useHardwareWalletsMetadata', () => ({
  useHardwareWalletsMetadata: mocks.hardwareWallets,
}));
vi.mock('@common/ledger/webhid', () => ({ isWebHidSupported: mocks.isWebHidSupported }));

const device = (name: string, principal: string): AccountMetadata => ({
  name,
  principal,
  accountId: `${name}-account`,
  type: AccountType.HardwareWallet,
});

describe('LedgerDevicesMenu', () => {
  beforeEach(() => {
    mocks.isWebHidSupported.mockReturnValue(true);
    mocks.hardwareWallets.mockReturnValue({
      data: [device('Nano X', 'aaaaa-aa'), device('Cold storage', 'rrkah-fqaaa-aaaaa-aaaaq-cai')],
    });
  });

  it('lists one item for each Ledger device', async () => {
    render(<LedgerDevicesMenu variant="button" onSelectDevice={vi.fn()} />);

    await userEvent.click(screen.getByTestId('ledger-devices-menu-trigger'));

    const items = screen.getAllByTestId('ledger-show-neurons');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Nano X');
    expect(items[1].textContent).toContain('Cold storage');
  });

  it('reports the selected device', async () => {
    const onSelectDevice = vi.fn();
    render(<LedgerDevicesMenu variant="link" onSelectDevice={onSelectDevice} />);

    await userEvent.click(screen.getByTestId('ledger-devices-menu-trigger'));
    await userEvent.click(screen.getAllByTestId('ledger-show-neurons')[1]);

    expect(onSelectDevice).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cold storage', principal: 'rrkah-fqaaa-aaaaa-aaaaq-cai' }),
    );
  });

  it('shows nothing without a Ledger device', () => {
    mocks.hardwareWallets.mockReturnValue({ data: [] });

    render(<LedgerDevicesMenu variant="button" onSelectDevice={vi.fn()} />);

    expect(screen.queryByTestId('ledger-devices-menu-trigger')).toBeNull();
  });

  it('shows nothing in a browser without WebHID', () => {
    mocks.isWebHidSupported.mockReturnValue(false);

    render(<LedgerDevicesMenu variant="button" onSelectDevice={vi.fn()} />);

    expect(screen.queryByTestId('ledger-devices-menu-trigger')).toBeNull();
  });
});
