import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';

import { type AccountMetadata, AccountType } from '../types';

/**
 * Fetches sub-account metadata from NNS dapp.
 * Skips the fetch when the subaccounts feature is disabled.
 */
export const useSubaccountsMetadata = () => {
  const { features } = useAdvancedFeatures();
  const nnsDappAccount = useNnsDappAccount(features.subaccounts);
  const subAccounts = nnsDappAccount.data?.response?.sub_accounts ?? [];

  const data: AccountMetadata[] = subAccounts.map((sa) => ({
    name: sa.name,
    accountId: sa.account_identifier,
    type: AccountType.Subaccount,
    subAccount: sa.sub_account,
  }));

  return { data, isLoading: nnsDappAccount.isLoading };
};
