import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';

import { AccountType, type AccountMetadata } from '../types';

/**
 * Fetches sub-account metadata from NNS dapp.
 */
export const useSubaccountsMetadata = () => {
  const nnsDappAccount = useNnsDappAccount();
  const subAccounts = nnsDappAccount.data?.response?.sub_accounts ?? [];

  const data: AccountMetadata[] = subAccounts.map((sa) => ({
    name: sa.name,
    accountId: sa.account_identifier,
    type: AccountType.Subaccount,
  }));

  return { data, isLoading: nnsDappAccount.isLoading };
};
