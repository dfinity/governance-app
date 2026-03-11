import { useState } from 'react';

import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';

import { useMainAccountMetadata } from './useMainAccountMetadata';

export function useAccountSelection(initialAccountId?: string) {
  const mainAccountMetadata = useMainAccountMetadata();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(initialAccountId);

  const { features } = useAdvancedFeatures();
  const subaccountsEnabled = features.subaccounts;

  // Falls back to main account id, derived synchronously from the identity.
  const resolvedAccountId = selectedAccountId ?? mainAccountMetadata.data!.accountId;

  return {
    selectedAccountId,
    setSelectedAccountId,
    resolvedAccountId,
    subaccountsEnabled,
  };
}
