import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useRef } from 'react';

import { QUERY_KEYS } from '@utils/query';

import { useIcpIndexTransactions } from './useIcpIndexTransactions';

/**
 * Global transaction polling hook that:
 * 1. Polls for new transactions every 2 seconds
 * 2. Detects when new transactions appear by comparing the latest transaction ID
 * 3. Automatically invalidates the balance query when new transactions are detected
 */
export const useGlobalTransactionPolling = () => {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const transactions = useIcpIndexTransactions();
  const lastTransactionIdRef = useRef<bigint | undefined>(undefined);

  // Track the latest transaction ID and detect changes
  useEffect(() => {
    const latestTxId = transactions.data?.pages?.[0]?.response.transactions[0]?.id;

    if (latestTxId !== undefined && lastTransactionIdRef.current !== undefined) {
      if (latestTxId !== lastTransactionIdRef.current) {
        // New transaction detected - invalidate balance
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
        });
      }
    }

    lastTransactionIdRef.current = latestTxId;
  }, [transactions.data, queryClient]);

  // Polling interval
  useEffect(() => {
    // Only poll when authenticated
    if (!identity) return;

    const interval = setInterval(() => {
      const isTabVisible = typeof document !== 'undefined' ? !document.hidden : true;
      const isFetchingTransactions = queryClient.isFetching({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });

      // Skip polling tick when the tab is not visible (e.g. another tab is selected),
      // or when transactions are already re-fetching, to save resources.
      if (isTabVisible && !isFetchingTransactions) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
        });
      }
    }, 2000); // Poll every 2 seconds.

    return () => clearInterval(interval);
  }, [queryClient, identity]);
};
