import { useEffect, useState } from 'react';

import { MIN_ASYNC_DELAY } from '@constants/extra';

import { MOCK_SUBACCOUNTS, type Subaccount } from '../data/mockSubaccounts';

/**
 * Returns the list of subaccounts for the current principal.
 * Currently backed by mock data; swap the implementation when the real API is available.
 */
export const useSubaccounts = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Subaccount[] | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_SUBACCOUNTS);
      setIsLoading(false);
    }, MIN_ASYNC_DELAY);

    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading };
};
