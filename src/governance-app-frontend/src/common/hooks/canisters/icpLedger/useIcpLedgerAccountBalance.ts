import { AnonymousIdentity } from '@dfinity/agent';
import { AccountIdentifier } from '@dfinity/ledger-icp';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { useQueryThenUpdateCall } from '@queries/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/queryKeys';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerAccountBalance = () => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpLedger();

  // If no identity is present, we use an anonymous identity to avoid errors.
  // The query will be disabled anyway if not authenticated.
  const accountIdentifier = AccountIdentifier.fromPrincipal({
    principal: identity?.getPrincipal() || new AnonymousIdentity().getPrincipal(),
  });

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, accountIdentifier],
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
