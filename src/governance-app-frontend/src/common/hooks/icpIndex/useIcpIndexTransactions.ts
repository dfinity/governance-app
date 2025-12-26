import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Option } from '@icp-sdk/canisters/nns';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { PAGINATION_LIMIT_TRANSACTIONS } from '@constants/extra';
import { useInfiniteQueryThenUpdateCall } from '@hooks/useInfiniteQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

export const useIcpIndexTransactions = () => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpIndex();

  // If no identity is present, we use an anonymous identity to avoid errors.
  // The query will be disabled anyway if not authenticated.
  const accountIdentifier = AccountIdentifier.fromPrincipal({
    principal: identity?.getPrincipal() || new AnonymousIdentity().getPrincipal(),
  });

  return useInfiniteQueryThenUpdateCall<
    IcpIndexDid.GetAccountIdentifierTransactionsResponse,
    Option<bigint>
  >({
    queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
    queryFn: (context) =>
      canister!.getTransactions({
        maxResults: BigInt(PAGINATION_LIMIT_TRANSACTIONS),
        start: context.pageParam,
        accountIdentifier,
        certified: false,
      }),
    updateFn: (context) =>
      canister!.getTransactions({
        maxResults: BigInt(PAGINATION_LIMIT_TRANSACTIONS),
        start: context.pageParam,
        accountIdentifier,
        certified: true,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      const lastTransactionId = lastPage.response.transactions.at(-1)?.id;
      const oldestTransactionId = lastPage.response.oldest_tx_id[0];
      if (!oldestTransactionId || !lastTransactionId) return undefined;
      if (lastTransactionId === oldestTransactionId) return undefined;
      return lastTransactionId;
    },
    options: {
      enabled: ready && authenticated,
    },
  });
};
