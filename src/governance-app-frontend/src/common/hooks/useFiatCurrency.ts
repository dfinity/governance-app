import { useSyncExternalStore } from 'react';

import { FIAT_CURRENCY_STORAGE_KEY } from '@constants/extra';
import { FiatCurrency } from '@constants/fiat';

const getStoredValue = (): FiatCurrency => {
  try {
    const value = localStorage.getItem(FIAT_CURRENCY_STORAGE_KEY);
    if (Object.values(FiatCurrency).includes(value as FiatCurrency)) return value as FiatCurrency;
  } catch {
    // ignore
  }
  return FiatCurrency.USD;
};

const storeValue = (currency: FiatCurrency): void => {
  localStorage.setItem(FIAT_CURRENCY_STORAGE_KEY, currency);
  notifyListeners();
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const onStorage = (e: StorageEvent) => {
  if (e.key === FIAT_CURRENCY_STORAGE_KEY) notifyListeners();
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

const getSnapshot = (): FiatCurrency => getStoredValue();

/**
 * Hook to manage the fiat currency that the user picked, with localStorage persistence.
 * Uses useSyncExternalStore for cross-component and cross-tab reactivity.
 */
export const useFiatCurrency = () => {
  const fiatCurrency = useSyncExternalStore(subscribe, getSnapshot);

  return { fiatCurrency, setFiatCurrency: storeValue };
};
