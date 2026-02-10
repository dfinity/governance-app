import { nonNullish } from '@dfinity/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { QueryType } from '@common/typings/queries';
import { QUERY_KEYS } from '@utils/query';

import { useIcpIndexTransactions } from './useIcpIndexTransactions';

/**
 * Hook that detects new transactions and invalidates the balance query.
 *
 * Uses a cheap non-certified query call every 2 s for change detection, while
 * the expensive certified update call only runs every 60 s — unless a change
 * is detected, in which case the certified query is also invalidated immediately.
 */
export const useIcpIndexTransactionsPolling = () => {
  const queryClient = useQueryClient();

  // Cheap query every 2 s, expensive update every 60 s
  const transactions = useIcpIndexTransactions({
    refetchInterval: 2_000,
    updateRefetchInterval: 60_000,
  });

  const lastTransactionIdRef = useRef<bigint | undefined>(undefined);

  // Track the latest transaction ID and detect changes
  useEffect(() => {
    const latestTxId = transactions.data?.pages?.[0]?.response.transactions[0]?.id;

    if (nonNullish(latestTxId) && nonNullish(lastTransactionIdRef.current)) {
      if (latestTxId !== lastTransactionIdRef.current) {
        // New transaction detected — invalidate balance
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
        });

        // Force an immediate certified refresh of transactions
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(QUERY_KEYS.ICP_INDEX.TRANSACTIONS) &&
            query.queryKey.includes(QueryType.Certified),
        });
      }
    }

    lastTransactionIdRef.current = latestTxId;
  }, [transactions.data, queryClient]);
};
