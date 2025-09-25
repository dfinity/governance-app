import { AnonymousIdentity } from '@dfinity/agent';
import { AccountIdentifier, GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import { Option } from '@dfinity/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { PAGINATION_LIMIT } from '@constants/extra';
import { useInfiniteQueryThenUpdateCall } from '@queries/useInfiniteQueryThenUpdateCall';
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

  return useInfiniteQueryThenUpdateCall<GetAccountIdentifierTransactionsResponse, Option<bigint>>({
    queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
    queryFn: (context) =>
      canister!.getTransactions({
        maxResults: BigInt(PAGINATION_LIMIT),
        start: context.pageParam,
        accountIdentifier,
        certified: false,
      }),
    updateFn: (context) =>
      canister!.getTransactions({
        maxResults: BigInt(PAGINATION_LIMIT),
        start: context.pageParam,
        accountIdentifier,
        certified: true,
      }),
    initialPageParam: 0n,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.response.transactions.length === PAGINATION_LIMIT
        ? BigInt(allPages.length * PAGINATION_LIMIT)
        : undefined,
    options: {
      enabled: ready && authenticated,
    },
  });
};
