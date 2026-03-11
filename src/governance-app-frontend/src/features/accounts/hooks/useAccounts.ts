import { useMemo } from 'react';

import { useIcpLedgerAccountsBalances } from '@hooks/icpLedger';

import type { AccountMeta, AccountsState, AccountWithBalance } from '../types';
import { useMainAccountMeta } from './useMainAccountMeta';
import { useSubaccountsMetadata } from './useSubaccountsMetadata';

const sortAccounts = (accounts: AccountWithBalance[]): AccountWithBalance[] => {
  const main = accounts.filter((a) => a.isMain);
  const rest = accounts
    .filter((a) => !a.isMain)
    .sort((a, b) => (b.balanceE8s > a.balanceE8s ? 1 : b.balanceE8s < a.balanceE8s ? -1 : 0));
  return [...main, ...rest];
};

export const useAccounts = () => {
  const mainAccountMeta = useMainAccountMeta();
  const subaccountsMetadata = useSubaccountsMetadata();

  const accountMetas = useMemo<AccountMeta[]>(() => {
    if (!mainAccountMeta.data) return [];
    return [mainAccountMeta.data, ...subaccountsMetadata.data];
  }, [mainAccountMeta.data, subaccountsMetadata.data]);

  const accountIds = accountMetas.map((a) => a.accountId);

  const balancesQuery = useIcpLedgerAccountsBalances({
    accountIds,
    enabled: accountMetas.length > 0,
  });

  const data = useMemo<AccountsState | undefined>(() => {
    if (!mainAccountMeta.data) return undefined;

    const accounts = sortAccounts(
      accountMetas.flatMap((account) => {
        const accountBalance = balancesQuery.byAccountId[account.accountId]?.data;
        if (accountBalance === undefined) return [];
        return [{ ...account, balanceE8s: accountBalance }];
      }),
    );

    return {
      accounts,
      totalBalanceE8s: accounts.reduce((sum, account) => sum + account.balanceE8s, 0n),
      hasSubaccounts: accounts.some((account) => !account.isMain),
      mainAccountId: mainAccountMeta.data.accountId,
      balancesByAccountId: balancesQuery.byAccountId,
    };
  }, [accountMetas, balancesQuery.byAccountId, mainAccountMeta.data]);

  return {
    data,
    isLoading: !mainAccountMeta.data || subaccountsMetadata.isLoading || balancesQuery.isLoading,
  };
};
