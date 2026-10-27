import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';

import { type AccountMetadata, AccountType } from '../types';

/**
 * Fetches the Ledger device accounts registered in NNS dapp.
 * Returns no accounts when the ledgerDevice feature is disabled.
 * Shares the NNS dapp account query with useSubaccountsMetadata.
 */
export const useHardwareWalletsMetadata = () => {
  const { features } = useAdvancedFeatures();
  const enabled = features.ledgerDevice;
  const nnsDappAccount = useNnsDappAccount(enabled || features.subaccounts);
  const hardwareWallets = enabled
    ? (nnsDappAccount.data?.response?.hardware_wallet_accounts ?? [])
    : [];

  const data: AccountMetadata[] = hardwareWallets.map((hw) => ({
    name: hw.name,
    accountId: hw.account_identifier,
    type: AccountType.HardwareWallet,
    principal: hw.principal.toText(),
  }));

  return {
    data,
    isLoading: enabled && nnsDappAccount.isLoading,
    isError: enabled && nnsDappAccount.isError,
    refetch: nnsDappAccount.refetch,
  };
};
