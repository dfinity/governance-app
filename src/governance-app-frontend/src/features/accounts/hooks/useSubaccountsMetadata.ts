import { useMemo } from 'react';

import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';

import { AccountType, type AccountMeta } from '../types';

/**
 * Fetches sub-account metadata from NNS dapp.
 */
export const useSubaccountsMetadata = () => {
  const nnsDappAccount = useNnsDappAccount();
  const subAccounts = nnsDappAccount.data?.response?.sub_accounts;

  return {
    data: useMemo<AccountMeta[]>(() => {
      const subs = subAccounts ?? [];
      return subs.map((sa) => ({
        name: sa.name,
        accountId: sa.account_identifier,
        type: AccountType.Subaccount,
      }));
    }, [subAccounts]),
    isLoading: nnsDappAccount.isLoading,
  };
};
