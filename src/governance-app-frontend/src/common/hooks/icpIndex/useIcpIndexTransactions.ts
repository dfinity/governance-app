import { AccountIdentifier, IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Option } from '@icp-sdk/canisters/nns';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { PAGINATION_LIMIT_TRANSACTIONS } from '@constants/extra';
import { useInfiniteQueryThenUpdateCall } from '@hooks/useInfiniteQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

/**
 * Fetches paginated transactions from the ICP Index canister.
 * When called without arguments, uses the main account.
 * Pass an accountId hex string to fetch transactions for a specific sub-account.
 */
export const useIcpIndexTransactions = (accountId?: string) => {
  const { identity } = useInternetIdentity();
  const { ready, authenticated, canister } = useIcpIndex();

  const accountIdentifier =
    accountId ??
    AccountIdentifier.fromPrincipal({
      principal: identity?.getPrincipal() || new AnonymousIdentity().getPrincipal(),
    }).toHex();

  return useInfiniteQueryThenUpdateCall<
    IcpIndexDid.GetAccountIdentifierTransactionsResponse,
    Option<bigint>
  >({
    queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS, accountIdentifier],
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
