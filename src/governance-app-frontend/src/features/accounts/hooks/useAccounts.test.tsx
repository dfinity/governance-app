import { Principal } from '@icp-sdk/core/principal';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '../types';
import { useAccounts } from './useAccounts';

const mocks = vi.hoisted(() => ({
  nnsDappAccount: vi.fn(),
  advancedFeatures: vi.fn(),
  mainAccountMetadata: vi.fn(),
  accountsBalances: vi.fn(),
}));

vi.mock('@hooks/nnsDapp/useNnsDappAccount', () => ({ useNnsDappAccount: mocks.nnsDappAccount }));
vi.mock('@hooks/useAdvancedFeatures', () => ({ useAdvancedFeatures: mocks.advancedFeatures }));
vi.mock('@hooks/icpLedger', () => ({ useIcpLedgerAccountsBalances: mocks.accountsBalances }));
vi.mock('./useMainAccountMetadata', () => ({
  useMainAccountMetadata: mocks.mainAccountMetadata,
}));

const MAIN = { name: 'Main', accountId: 'main-id', type: AccountType.Main };
const SUB_ACCOUNT = { name: 'Savings', account_identifier: 'sub-id', sub_account: [1] };
const DEVICE = {
  name: 'Nano X',
  principal: Principal.fromText('aaaaa-aa'),
  account_identifier: 'device-id',
};

const BALANCES: Record<string, bigint> = {
  'main-id': 10_000_000_000n,
  'sub-id': 4_000_000_000n,
  'device-id': 1_250_000_000n,
};

const mockFeatures = (features: { subaccounts?: boolean; ledgerDevice?: boolean }) =>
  mocks.advancedFeatures.mockReturnValue({
    features: { subaccounts: false, ledgerDevice: false, ...features },
  });

describe('useAccounts', () => {
  beforeEach(() => {
    mocks.mainAccountMetadata.mockReturnValue({ data: MAIN, isLoading: false });
    mocks.nnsDappAccount.mockReturnValue({
      data: { response: { sub_accounts: [SUB_ACCOUNT], hardware_wallet_accounts: [DEVICE] } },
      isLoading: false,
    });
    mocks.accountsBalances.mockImplementation(({ accountIds }: { accountIds: string[] }) => ({
      byAccountId: Object.fromEntries(
        accountIds.map((id) => [id, { data: { response: BALANCES[id] }, isError: false }]),
      ),
      isLoading: false,
    }));
  });

  it('lists the main account, the sub-accounts, then the Ledger device accounts', () => {
    mockFeatures({ subaccounts: true, ledgerDevice: true });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.data?.accounts.map((a) => [a.name, a.type])).toEqual([
      ['Main', AccountType.Main],
      ['Savings', AccountType.Subaccount],
      ['Nano X', AccountType.HardwareWallet],
    ]);
    expect(result.current.data?.accounts[2]).toMatchObject({
      status: 'ready',
      balanceE8s: 1_250_000_000n,
      principal: 'aaaaa-aa',
    });
    expect(result.current.data?.totalBalanceE8s).toBe(15_250_000_000n);
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps the Ledger device accounts out when the feature is off', () => {
    mockFeatures({ subaccounts: true });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.data?.accounts.map((a) => a.name)).toEqual(['Main', 'Savings']);
    expect(result.current.data?.totalBalanceE8s).toBe(14_000_000_000n);
  });

  it('shows the Ledger device accounts without the subaccounts feature', () => {
    mockFeatures({ ledgerDevice: true });

    const { result } = renderHook(() => useAccounts());

    expect(result.current.data?.accounts.map((a) => a.name)).toEqual(['Main', 'Nano X']);
    expect(result.current.data?.hasSubaccounts).toBe(true);
  });
});
