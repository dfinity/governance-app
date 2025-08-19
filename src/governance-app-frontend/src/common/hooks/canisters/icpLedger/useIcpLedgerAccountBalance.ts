import { useQueryThenCertifyCall } from '@common/queries/useQueryThenCertifyCall';
import { QUERY_KEYS } from '@common/utils/queryKeys';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerAccountBalance = () => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpLedger();
  const accountIdentifier = identity!.getPrincipal().toString();

  return useQueryThenCertifyCall({
    queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
    uncertifiedFn: () =>
      canister!.accountBalance({
        accountIdentifier,
        certified: false,
      }),
    certifiedFn: () =>
      canister!.accountBalance({
        accountIdentifier,
        certified: true,
      }),
    options: {
      enabled: ready && authenticated,
    },
  });
};
