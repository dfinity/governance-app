import { useMemo } from 'react';

import { useIcpLedgerAccountsBalances } from '@hooks/icpLedger';

import { AccountType, type Account, type AccountMeta, type AccountsState } from '../types';
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

  const accountMetas = useMemo<AccountMeta[]>(() => {
    if (!mainAccountMetadata.data) return [];
    return [mainAccountMetadata.data, ...subaccountsMetadata.data];
  }, [mainAccountMetadata.data, subaccountsMetadata.data]);

  const accountIds = accountMetas.map((a) => a.accountId);

  const balancesQuery = useIcpLedgerAccountsBalances({
    accountIds,
    enabled: accountMetas.length > 0,
  });

  const data = useMemo<AccountsState | undefined>(() => {
    if (!mainAccountMetadata.data) return undefined;

    const accounts = sortAccounts(
      accountMetas.map((meta): Account => {
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

    return {
      accounts,
      totalBalanceE8s: readyAccounts.reduce((sum, a) => sum + a.balanceE8s, 0n),
      isTotalPartial: readyAccounts.length < accounts.length,
      hasSubaccounts: accounts.some((a) => a.type !== AccountType.Main),
      mainAccountId: mainAccountMetadata.data.accountId,
    };
  }, [accountMetas, balancesQuery.byAccountId, mainAccountMetadata.data]);

  return {
    data,
    isLoading: !mainAccountMetadata.data || subaccountsMetadata.isLoading,
  };
};
