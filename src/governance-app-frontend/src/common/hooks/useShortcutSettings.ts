import { useCallback, useSyncExternalStore } from 'react';

import { SHORTCUTS_SETTINGS_KEY } from '@constants/extra';

const getStoredValue = (): boolean => {
  try {
    return localStorage.getItem(SHORTCUTS_SETTINGS_KEY) === 'true';
  } catch {
    return false;
  }
};

const storeValue = (enabled: boolean): void => {
  localStorage.setItem(SHORTCUTS_SETTINGS_KEY, String(enabled));
  notifyListeners();
};

// External store for cross-component and cross-tab reactivity
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners = [...listeners, listener];

  // Cross-tab sync: when another tab changes localStorage, the "storage" event
  // fires in this tab (not in the tab that made the change). Notify all
  // subscribers so they re-read the value and re-render.
  const onStorage = (e: StorageEvent) => {
    if (e.key === SHORTCUTS_SETTINGS_KEY) notifyListeners();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener('storage', onStorage);
  };
};

const getSnapshot = (): boolean => getStoredValue();

/**
 * Hook to manage keyboard shortcuts global toggle with localStorage persistence.
 * Uses useSyncExternalStore for cross-component reactivity.
 * Returns a single boolean — all shortcuts are either enabled or disabled together.
 */
export const useShortcutSettings = () => {
  const enabled = useSyncExternalStore(subscribe, getSnapshot);

  const setEnabled = useCallback((value: boolean) => {
    storeValue(value);
  }, []);

  return { enabled, setEnabled };
};
