import { useEffect, useMemo, useState } from 'react';

import { MIN_ASYNC_DELAY } from '@constants/extra';

import { MOCK_SUBACCOUNTS, type Subaccount } from '../data/mockSubaccounts';

/**
 * Canonical sort: main account (index 0) first, rest sorted by balance descending.
 */
const sortAccounts = (accounts: Subaccount[]): Subaccount[] => {
  const main = accounts.filter((a) => a.subaccountIndex === 0);
  const rest = accounts
    .filter((a) => a.subaccountIndex !== 0)
    .sort((a, b) => (b.balanceE8s > a.balanceE8s ? 1 : b.balanceE8s < a.balanceE8s ? -1 : 0));
  return [...main, ...rest];
};

/**
 * Returns the list of subaccounts for the current principal.
 * Always sorted: main account first, rest by balance descending.
 * Currently backed by mock data; swap the implementation when the real API is available.
 */
export const useSubaccounts = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [raw, setRaw] = useState<Subaccount[] | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRaw(MOCK_SUBACCOUNTS);
      setIsLoading(false);
    }, MIN_ASYNC_DELAY);

    return () => clearTimeout(timer);
  }, []);

  const data = useMemo(() => (raw ? sortAccounts(raw) : undefined), [raw]);

  return { data, isLoading };
};
