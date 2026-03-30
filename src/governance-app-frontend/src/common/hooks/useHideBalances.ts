import { useSyncExternalStore } from 'react';

import { HIDE_BALANCES_KEY } from '@constants/extra';

const getStoredValue = (): boolean => {
  try {
    return localStorage.getItem(HIDE_BALANCES_KEY) === 'true';
  } catch {
    return false;
  }
};

const storeValue = (hidden: boolean): void => {
  localStorage.setItem(HIDE_BALANCES_KEY, String(hidden));
  notifyListeners();
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const onStorage = (e: StorageEvent) => {
  if (e.key === HIDE_BALANCES_KEY) notifyListeners();
};

const subscribe = (listener: () => void) => {
  const isFirst = listeners.length === 0;
  listeners = [...listeners, listener];
  if (isFirst) window.addEventListener('storage', onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length === 0) window.removeEventListener('storage', onStorage);
  };
};

const getSnapshot = (): boolean => getStoredValue();

/**
 * Hook to manage the hide balances privacy toggle with localStorage persistence.
 * Uses useSyncExternalStore for cross-component and cross-tab reactivity.
 */
export const useHideBalances = () => {
  const hidden = useSyncExternalStore(subscribe, getSnapshot);

  return { hidden, setHidden: storeValue };
};
