import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';
import { useSubaccountsMetadata } from '@features/accounts/hooks/useSubaccountsMetadata';

import { useAddressBook } from '@hooks/addressBook/useAddressBook';

/**
 * Returns the names that the user gave: the address book names, the sub-account names, and the
 * Ledger device account names. Analytics must not receive these names.
 */
export const usePrivateNames = (): string[] => {
  const addressBook = useAddressBook();
  const subaccounts = useSubaccountsMetadata();
  const hardwareWallets = useHardwareWalletsMetadata();

  return [
    ...(addressBook.data?.response?.named_addresses ?? []).map(({ name }) => name),
    ...subaccounts.data.map(({ name }) => name),
    ...hardwareWallets.data.map(({ name }) => name),
  ];
};
