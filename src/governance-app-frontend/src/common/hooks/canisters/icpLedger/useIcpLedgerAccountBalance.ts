import { useInternetIdentity } from 'ic-use-internet-identity';

import { useQueryThenUpdateCall } from '@queries/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/queryKeys';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerAccountBalance = () => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpLedger();
  const accountIdentifier = identity!.getPrincipal().toString();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.ICP_LEDGER.GET_ACCOUNT_BALANCE, accountIdentifier],
    queryFn: () =>
      canister!.accountBalance({
        accountIdentifier,
        certified: false,
      }),
    updateFn: () =>
      canister!.accountBalance({
        accountIdentifier,
        certified: true,
      }),
    options: {
      enabled: ready && authenticated,
    },
  });
};
