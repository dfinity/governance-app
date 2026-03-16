import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountsBalances } from '@hooks/icpLedger';
import { bigIntDiv } from '@utils/bigInt';

import { type Account, type AccountMetadata, type AccountsState, AccountType } from '../types';
import { useMainAccountMetadata } from './useMainAccountMetadata';
import { useSubaccountsMetadata } from './useSubaccountsMetadata';

const sortAccounts = (accounts: Account[]): Account[] => {
  const main = accounts.filter((a) => a.type === AccountType.Main);
  const rest = accounts
    .filter((a) => a.type !== AccountType.Main)
    .sort((a, b) => {
      const aBalance = a.status === 'ready' ? a.balanceE8s : 0n;
      const bBalance = b.status === 'ready' ? b.balanceE8s : 0n;
      return bBalance > aBalance ? 1 : bBalance < aBalance ? -1 : 0;
    });
  return [...main, ...rest];
};

export const useAccounts = () => {
  const mainAccountMetadata = useMainAccountMetadata();
  const subaccountsMetadata = useSubaccountsMetadata();

  const accountsMetadata: AccountMetadata[] = mainAccountMetadata.data
    ? [mainAccountMetadata.data, ...subaccountsMetadata.data]
    : [];

  const accountIds = accountsMetadata.map((a) => a.accountId);

  const balancesQuery = useIcpLedgerAccountsBalances({
    accountIds,
    enabled: accountsMetadata.length > 0,
  });

  if (!mainAccountMetadata.data) {
    return {
      data: undefined,
      isLoading: !mainAccountMetadata.data || subaccountsMetadata.isLoading,
      isLoadingBalances: true,
      totalBalanceIcp: 0,
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

  const isLoadingBalances = accounts.length === 0 || accounts.some((a) => a.status === 'loading');
  const totalBalanceIcp = isLoadingBalances ? 0 : bigIntDiv(data.totalBalanceE8s, E8Sn);

  return {
    data,
    isLoading: !mainAccountMetadata.data || subaccountsMetadata.isLoading,
    isLoadingBalances,
    totalBalanceIcp,
  };
};
