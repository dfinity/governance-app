import { useState } from 'react';

import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';

import { useHardwareWalletsMetadata } from './useHardwareWalletsMetadata';
import { useMainAccountMetadata } from './useMainAccountMetadata';

export function useAccountSelection(initialAccountId?: string) {
  const mainAccountMetadata = useMainAccountMetadata();
  const hardwareWalletsMetadata = useHardwareWalletsMetadata();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(initialAccountId);

  const { features } = useAdvancedFeatures();
  const subaccountsEnabled = features.subaccounts;

  // The app cannot sign with a Ledger device yet, so a Ledger account is never the source.
  const isHardwareWallet = hardwareWalletsMetadata.data.some(
    (account) => account.accountId === selectedAccountId,
  );

  // Falls back to main account id, derived synchronously from the identity.
  const resolvedAccountId =
    (isHardwareWallet ? undefined : selectedAccountId) ?? mainAccountMetadata.data!.accountId;

  return {
    selectedAccountId,
    setSelectedAccountId,
    resolvedAccountId,
    subaccountsEnabled,
  };
}
