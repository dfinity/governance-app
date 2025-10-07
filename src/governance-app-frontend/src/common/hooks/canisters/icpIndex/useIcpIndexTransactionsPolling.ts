import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { QUERY_KEYS } from '@utils/query';

export const useIcpIndexTransactionsPolling = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      const isPageVisible = typeof document !== 'undefined' ? !document.hidden : true;
      const isFetchingTransactions = queryClient.isFetching({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });

      // Stop polling when the page is not visible to save resources, or when transactions are already re-fetching.
      if (isPageVisible && !isFetchingTransactions) {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
        });
      }
    }, 2000); // Poll every 2 seconds.

    return () => clearInterval(interval);
  }, [queryClient]);
};
