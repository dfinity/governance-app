import { useMemo } from 'react';

import { useIcpLedgerAccountsBalances } from '@hooks/icpLedger';

import type { Account, AccountMeta, AccountsState } from '../types';
import { useMainAccountMeta } from './useMainAccountMeta';
import { useSubaccountsMetadata } from './useSubaccountsMetadata';

const sortAccounts = (accounts: Account[]): Account[] => {
  const main = accounts.filter((a) => a.type === 'main');
  const rest = accounts
    .filter((a) => a.type !== 'main')
    .sort((a, b) => {
      const aBalance = a.status === 'ready' ? a.balanceE8s : 0n;
      const bBalance = b.status === 'ready' ? b.balanceE8s : 0n;
      return bBalance > aBalance ? 1 : bBalance < aBalance ? -1 : 0;
    });
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
      accountMetas.map((meta): Account => {
        const balanceState = balancesQuery.byAccountId[meta.accountId];

        if (balanceState?.isError) {
          return { ...meta, status: 'error', error: balanceState.error };
        }

        if (balanceState?.data !== undefined) {
          return { ...meta, status: 'ready', balanceE8s: balanceState.data };
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
      hasSubaccounts: accounts.some((a) => a.type !== 'main'),
      mainAccountId: mainAccountMeta.data.accountId,
    };
  }, [accountMetas, balancesQuery.byAccountId, mainAccountMeta.data]);

  return {
    data,
    isLoading: !mainAccountMeta.data || subaccountsMetadata.isLoading,
  };
};
