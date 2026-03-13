import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountType, type AccountMetadata } from '../types';

export const useMainAccountMetadata = () => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const data: AccountMetadata | undefined = useMemo(() => {
    if (!identity) return undefined;

    return {
      name: t(($) => $.accounts.mainAccount),
      accountId: AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      }).toHex(),
      type: AccountType.Main,
    };
  }, [identity, t]);

  return { data, isLoading: false };
};
