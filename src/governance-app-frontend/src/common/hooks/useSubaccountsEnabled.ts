import { useSyncExternalStore } from 'react';

import { SUBACCOUNTS_SETTINGS_KEY } from '@constants/extra';

const getStoredValue = (): boolean => {
  try {
    return localStorage.getItem(SUBACCOUNTS_SETTINGS_KEY) === 'true';
  } catch {
    return false;
  }
};

const storeValue = (enabled: boolean): void => {
  localStorage.setItem(SUBACCOUNTS_SETTINGS_KEY, String(enabled));
  notifyListeners();
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const onStorage = (e: StorageEvent) => {
  if (e.key === SUBACCOUNTS_SETTINGS_KEY) notifyListeners();
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
 * Hook to manage subaccounts feature toggle with localStorage persistence.
 * Uses useSyncExternalStore for cross-component reactivity.
 */
export const useSubaccountsEnabled = () => {
  const enabled = useSyncExternalStore(subscribe, getSnapshot);

  return { enabled, setEnabled: storeValue };
};
