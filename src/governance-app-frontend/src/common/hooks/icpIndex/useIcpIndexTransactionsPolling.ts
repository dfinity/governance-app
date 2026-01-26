import { nonNullish } from '@dfinity/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { QUERY_KEYS } from '@utils/query';

import { useIcpIndexTransactions } from './useIcpIndexTransactions';

/**
 * Hook that detects new transactions and invalidates the balance query.
 * Polling is handled by React Query's refetchInterval on useIcpIndexTransactions.
 */
export const useIcpIndexTransactionsPolling = () => {
  const queryClient = useQueryClient();
  // Poll for new transactions every 2 seconds
  const transactions = useIcpIndexTransactions({ refetchInterval: 2000 });
  const lastTransactionIdRef = useRef<bigint | undefined>(undefined);

  // Track the latest transaction ID and detect changes
  useEffect(() => {
    const latestTxId = transactions.data?.pages?.[0]?.response.transactions[0]?.id;

    if (nonNullish(latestTxId) && nonNullish(lastTransactionIdRef.current)) {
      if (latestTxId !== lastTransactionIdRef.current) {
        // New transaction detected - invalidate balance
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
        });
      }
    }

    lastTransactionIdRef.current = latestTxId;
  }, [transactions.data, queryClient]);
};
