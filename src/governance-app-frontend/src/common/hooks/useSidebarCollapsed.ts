import { useSyncExternalStore } from 'react';

import { SIDEBAR_COLLAPSED_KEY } from '@constants/extra';
import { getStorageItem, setStorageItem } from '@utils/storage';

const readStoredValue = (): boolean => getStorageItem(SIDEBAR_COLLAPSED_KEY) === 'true';

// The state in memory. The storage only persists it, so the toggle works when the browser denies
// the storage. `undefined` until the first read.
let current: boolean | undefined;

const getSnapshot = (): boolean => (current ??= readStoredValue());

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const storeValue = (collapsed: boolean): void => {
  current = collapsed;
  setStorageItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  notifyListeners();
};

const onStorage = (e: StorageEvent) => {
  if (e.key !== SIDEBAR_COLLAPSED_KEY) return;
  current = readStoredValue();
  notifyListeners();
};

const subscribe = (listener: () => void) => {
  const isFirst = listeners.length === 0;
  listeners = [...listeners, listener];
  if (isFirst) window.addEventListener('storage', onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length > 0) return;
    window.removeEventListener('storage', onStorage);
    // The next subscriber reads the storage again.
    current = undefined;
  };
};

/**
 * Whether the desktop sidebar shows only its icons, with localStorage persistence.
 * Uses useSyncExternalStore for cross-component and cross-tab reactivity.
 */
export const useSidebarCollapsed = () => {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot);

  return { collapsed, setCollapsed: storeValue };
};
