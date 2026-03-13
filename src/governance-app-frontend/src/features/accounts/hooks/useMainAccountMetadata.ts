import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { AccountType, type AccountMetadata } from '../types';

export const useMainAccountMetadata = () => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const data: AccountMetadata | undefined = identity
    ? {
        name: t(($) => $.accounts.mainAccount),
        accountId: AccountIdentifier.fromPrincipal({
          principal: identity.getPrincipal(),
        }).toHex(),
        type: AccountType.Main,
      }
    : undefined;

  return { data, isLoading: false };
};
