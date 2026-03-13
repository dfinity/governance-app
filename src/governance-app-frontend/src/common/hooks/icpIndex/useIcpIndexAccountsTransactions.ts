import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import {
  useQueriesThenUpdateCalls,
  type QueriesThenUpdateItemState,
} from '@hooks/useQueriesThenUpdateCalls';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndex } from './useIcpIndex';

type TransactionsResponse = IcpIndexDid.GetAccountIdentifierTransactionsResponse;

type AccountTransactionsState = {
  data?: TransactionsResponse;
  certified?: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
};

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

  const byAccountId = accountIds.reduce<Record<string, AccountTransactionsState>>(
    (acc, accountId) => {
      const state: QueriesThenUpdateItemState<TransactionsResponse> = calls.byItemKey[accountId];
      acc[accountId] = {
        data: state.data?.response,
        certified: state.certified,
        isLoading: state.isLoading,
        isFetching: state.isFetching,
        isError: state.isError,
        error: state.error,
      };
      return acc;
    },
    {},
  );

  return {
    byAccountId,
    queryCalls: calls.queryCalls,
    updateCalls: calls.updateCalls,
    isLoading: calls.isLoadingAny,
    isFetching: calls.isFetchingAny,
    isError: calls.hasAnyError,
  };
};
