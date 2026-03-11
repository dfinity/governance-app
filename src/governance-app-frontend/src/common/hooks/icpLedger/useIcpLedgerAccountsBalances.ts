import { useQueriesThenUpdateCalls } from '@hooks/useQueriesThenUpdateCalls';
import { QUERY_KEYS } from '@utils/query';

import { useIcpLedger } from './useIcpLedger';

type Props = {
  accountIds: string[];
  enabled?: boolean;
};

export const useIcpLedgerAccountsBalances = ({ accountIds, enabled = true }: Props) => {
  const { ready, authenticated, canister } = useIcpLedger();

  const calls = useQueriesThenUpdateCalls({
    items: accountIds,
    getItemKey: (accountId) => accountId,
    getQueryKey: (accountId) => [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, accountId],
    queryFn: (accountId) =>
      canister!.accountBalance({
        accountIdentifier: accountId,
        certified: false,
      }),
    updateFn: (accountId) =>
      canister!.accountBalance({
        accountIdentifier: accountId,
        certified: true,
      }),
    enabled: enabled && ready && authenticated,
  });

  const byAccountId = accountIds.reduce<
    Record<
      string,
      {
        data?: bigint;
        certified?: boolean;
        isLoading: boolean;
        isFetching: boolean;
        isError: boolean;
        error?: unknown;
      }
    >
  >((acc, accountId) => {
    const state = calls.byItemKey[accountId];
    acc[accountId] = {
      data: state.data?.response,
      certified: state.certified,
      isLoading: state.isLoading,
      isFetching: state.isFetching,
      isError: state.isError,
      error: state.error,
    };
    return acc;
  }, {});

  return {
    byAccountId,
    queryCalls: calls.queryCalls,
    updateCalls: calls.updateCalls,
    isLoading: calls.isLoadingAny,
    isFetching: calls.isFetchingAny,
    isError: calls.hasAnyError,
  };
};
