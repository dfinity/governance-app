import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { icpLedgerAccountBalanceQuery } from '@common/queries/icpLedger';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerAccountBalance = (accountId?: string) => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated } = useIcpLedger();

  const accountIdentifier =
    accountId ??
    // If no identity is present, we use an anonymous identity to avoid errors.
    // The query will be disabled anyway if not authenticated.
    AccountIdentifier.fromPrincipal({
      principal: identity?.getPrincipal() || new AnonymousIdentity().getPrincipal(),
    }).toHex();

  return useQueryThenUpdateCall({
    ...icpLedgerAccountBalanceQuery(accountIdentifier),
    options: {
      enabled: ready && authenticated,
    },
  });
};
