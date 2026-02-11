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
  listeners.forEach((listener) => listener());
};

// External store for cross-component reactivity
let listeners: Array<() => void> = [];

const subscribe = (listener: () => void) => {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

// Primitive return value (boolean) — stable across calls with same stored value,
// so useSyncExternalStore won't trigger infinite re-renders.
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
