import { useQueriesThenUpdateCalls } from '@hooks/useQueriesThenUpdateCalls';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

type Props = {
  accountIds: string[];
  maxResults?: bigint;
  enabled?: boolean;
};

export const useIcpIndexAccountsTransactions = ({
  accountIds,
  maxResults = 5n,
  enabled = true,
}: Props) => {
  const { ready, authenticated, canister } = useIcpIndex();

  const calls = useQueriesThenUpdateCalls({
    items: accountIds,
    getItemKey: (accountId) => accountId,
    getQueryKey: (accountId) => [QUERY_KEYS.ICP_INDEX.TRANSACTIONS, accountId, maxResults],
    queryFn: (accountId) =>
      canister!.getTransactions({
        maxResults,
        accountIdentifier: accountId,
        certified: false,
      }),
    updateFn: (accountId) =>
      canister!.getTransactions({
        maxResults,
        accountIdentifier: accountId,
        certified: true,
      }),
    enabled: enabled && ready && authenticated,
  });

  return {
    byAccountId: calls.byItemKey,
    queryCalls: calls.queryCalls,
    updateCalls: calls.updateCalls,
    isLoading: calls.isLoadingAny,
    isFetching: calls.isFetchingAny,
    isError: calls.hasAnyError,
  };
};
