import { useEffect, useState } from 'react';

import { MIN_ASYNC_DELAY } from '@constants/extra';

import { MOCK_TRANSACTIONS, type MockTransaction } from '../data/mockTransactions';

/**
 * Returns recent transactions aggregated across all subaccounts.
 * Currently backed by mock data; swap the implementation when the real API is available.
 */
export const useRecentTransactions = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<MockTransaction[] | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_TRANSACTIONS);
      setIsLoading(false);
    }, MIN_ASYNC_DELAY);

    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading };
};
