import { useQueriesThenUpdateCalls } from '@hooks/useQueriesThenUpdateCalls';
import { icpLedgerAccountBalanceQuery } from '@common/queries/icpLedger';

import { useIcpLedger } from './useIcpLedger';

type Props = {
  accountIds: string[];
  enabled?: boolean;
};

export const useIcpLedgerAccountsBalances = ({ accountIds, enabled = true }: Props) => {
  const { ready, authenticated } = useIcpLedger();

  const calls = useQueriesThenUpdateCalls({
    items: accountIds,
    getItemKey: (accountId) => accountId,
    getQueryKey: (accountId) => icpLedgerAccountBalanceQuery(accountId).queryKey,
    queryFn: (accountId) => icpLedgerAccountBalanceQuery(accountId).queryFn(),
    updateFn: (accountId) => icpLedgerAccountBalanceQuery(accountId).updateFn(),
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
