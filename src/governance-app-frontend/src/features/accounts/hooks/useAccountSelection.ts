import { useState } from 'react';

import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { isAccountPickerEnabled } from '@utils/advancedFeatures';

import { canSignFromAccount } from '../types';
import { useHardwareWalletsMetadata } from './useHardwareWalletsMetadata';
import { useMainAccountMetadata } from './useMainAccountMetadata';

export function useAccountSelection(initialAccountId?: string) {
  const mainAccountMetadata = useMainAccountMetadata();
  const hardwareWalletsMetadata = useHardwareWalletsMetadata();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(initialAccountId);

  const { features } = useAdvancedFeatures();
  const accountPickerEnabled = isAccountPickerEnabled(features);

  // A Ledger device account is a source only in a browser that can sign with the device.
  const selectedDevice = hardwareWalletsMetadata.data.find(
    (account) => account.accountId === selectedAccountId,
  );
  const canSign = selectedDevice === undefined || canSignFromAccount(selectedDevice);

  // Falls back to main account id, derived synchronously from the identity.
  const resolvedAccountId =
    (canSign ? selectedAccountId : undefined) ?? mainAccountMetadata.data!.accountId;

  return {
    selectedAccountId,
    setSelectedAccountId,
    resolvedAccountId,
    accountPickerEnabled,
  };
}
