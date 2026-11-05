import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';

import { type AccountMetadata, AccountType } from '../types';

/**
 * Fetches sub-account metadata from NNS dapp.
 * Returns no accounts when the subaccounts feature is disabled.
 * The NNS dapp account also carries the Ledger device accounts, so the fetch runs
 * when either feature is enabled and both hooks share the one query.
 */
export const useSubaccountsMetadata = () => {
  const { features } = useAdvancedFeatures();
  const enabled = features.subaccounts;
  const nnsDappAccount = useNnsDappAccount(enabled || features.ledgerDevice);
  const subAccounts = enabled ? (nnsDappAccount.data?.response?.sub_accounts ?? []) : [];

  const data: AccountMetadata[] = subAccounts.map((sa) => ({
    name: sa.name,
    accountId: sa.account_identifier,
    type: AccountType.Subaccount,
    subAccount: sa.sub_account,
  }));

  return { data, isLoading: enabled && nnsDappAccount.isLoading };
};
