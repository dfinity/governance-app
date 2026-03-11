import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccountMeta } from '../types';

export const useMainAccountMeta = () => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const data: AccountMeta | undefined = useMemo(() => {
    if (!identity) return undefined;

    return {
      name: t(($) => $.accounts.mainAccount),
      accountId: AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      }).toHex(),
      type: 'main',
    };
  }, [identity, t]);

  return { data };
};
