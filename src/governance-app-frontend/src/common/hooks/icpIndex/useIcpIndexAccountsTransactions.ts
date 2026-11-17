import { useQueriesThenUpdateCalls } from '@hooks/useQueriesThenUpdateCalls';
import { icpIndexAccountTransactionsQuery } from '@common/queries/icpIndex';

import { useIcpIndex } from './useIcpIndex';

type Props = {
  accountIds: string[];
  maxResults?: bigint;
  enabled?: boolean;
};

export const useIcpIndexAccountsTransactions = ({
  accountIds,
  maxResults,
  enabled = true,
}: Props) => {
  const { ready, authenticated } = useIcpIndex();

  const calls = useQueriesThenUpdateCalls({
    items: accountIds,
    getItemKey: (accountId) => accountId,
    getQueryKey: (accountId) => icpIndexAccountTransactionsQuery(accountId, maxResults).queryKey,
    queryFn: (accountId) => icpIndexAccountTransactionsQuery(accountId, maxResults).queryFn(),
    updateFn: (accountId) => icpIndexAccountTransactionsQuery(accountId, maxResults).updateFn(),
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
