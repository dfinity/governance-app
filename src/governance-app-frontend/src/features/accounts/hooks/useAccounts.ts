import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountsBalances } from '@hooks/icpLedger';
import { bigIntDiv } from '@utils/bigInt';

import { type Account, type AccountMetadata, type AccountsState, AccountType } from '../types';
import { useHardwareWalletsMetadata } from './useHardwareWalletsMetadata';
import { useMainAccountMetadata } from './useMainAccountMetadata';
import { useSubaccountsMetadata } from './useSubaccountsMetadata';

const byBalanceDesc = (a: Account, b: Account): number => {
  const aBalance = a.status === 'ready' ? a.balanceE8s : 0n;
  const bBalance = b.status === 'ready' ? b.balanceE8s : 0n;
  return bBalance > aBalance ? 1 : bBalance < aBalance ? -1 : 0;
};

/** Main first, then the sub-accounts, then the Ledger device accounts. Each group is sorted by balance. */
const sortAccounts = (accounts: Account[]): Account[] => {
  const ofType = (type: AccountType) => accounts.filter((a) => a.type === type);
  return [
    ...ofType(AccountType.Main),
    ...ofType(AccountType.Subaccount).sort(byBalanceDesc),
    ...ofType(AccountType.HardwareWallet).sort(byBalanceDesc),
  ];
};

export const useAccounts = () => {
  const mainAccountMetadata = useMainAccountMetadata();
  const subaccountsMetadata = useSubaccountsMetadata();
  const hardwareWalletsMetadata = useHardwareWalletsMetadata();

  const accountsMetadata: AccountMetadata[] = mainAccountMetadata.data
    ? [mainAccountMetadata.data, ...subaccountsMetadata.data, ...hardwareWalletsMetadata.data]
    : [];

  const accountIds = accountsMetadata.map((a) => a.accountId);

  const balancesQuery = useIcpLedgerAccountsBalances({
    accountIds,
    enabled: accountsMetadata.length > 0,
  });

  if (!mainAccountMetadata.data) {
    return {
      data: undefined,
      isLoading: true,
      totalBalanceIcp: undefined,
    };
  }

  const accounts = sortAccounts(
    accountsMetadata.map((meta): Account => {
      const balanceState = balancesQuery.byAccountId[meta.accountId];

      if (balanceState?.isError) {
        return { ...meta, status: 'error', error: balanceState.error };
      }

      if (balanceState?.data?.response !== undefined) {
        return { ...meta, status: 'ready', balanceE8s: balanceState.data.response };
      }

      return { ...meta, status: 'loading' };
    }),
  );

  const readyAccounts = accounts.filter(
    (a): a is Extract<Account, { status: 'ready' }> => a.status === 'ready',
  );

  const data: AccountsState = {
    accounts,
    totalBalanceE8s: readyAccounts.reduce((sum, a) => sum + a.balanceE8s, 0n),
    hasSubaccounts: accounts.some((a) => a.type !== AccountType.Main),
    mainAccountId: mainAccountMetadata.data.accountId,
  };

  const isLoading =
    subaccountsMetadata.isLoading ||
    hardwareWalletsMetadata.isLoading ||
    accounts.length === 0 ||
    accounts.some((a) => a.status === 'loading');
  const totalBalanceIcp = isLoading ? undefined : bigIntDiv(data.totalBalanceE8s, E8Sn);

  return {
    data,
    isLoading,
    totalBalanceIcp,
  };
};
