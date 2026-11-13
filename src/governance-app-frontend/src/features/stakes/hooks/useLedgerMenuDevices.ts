import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';
import type { AccountMetadata } from '@features/accounts/types';

import { isWebHidSupported } from '@common/ledger/webhid';

/** The Ledger devices that the Neurons page menu lists. Empty in a browser without WebHID. */
export const useLedgerMenuDevices = (): AccountMetadata[] => {
  const { data: devices } = useHardwareWalletsMetadata();
  return isWebHidSupported() ? devices : [];
};
