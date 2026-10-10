import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useTranslation } from 'react-i18next';

import { useInternetIdentity } from '@hooks/useInternetIdentity';

import { type AccountMetadata, AccountType } from '../types';

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
