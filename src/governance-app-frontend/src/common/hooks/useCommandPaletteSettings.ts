import { isNullish } from '@dfinity/utils';
import { useSyncExternalStore } from 'react';

import { COMMAND_PALETTE_SETTINGS_KEY } from '@constants/extra';

const getStoredValue = (): boolean => {
  try {
    const raw = localStorage.getItem(COMMAND_PALETTE_SETTINGS_KEY);
    if (isNullish(raw)) return true;
    return raw === 'true';
  } catch {
    return true;
  }
};

const storeValue = (enabled: boolean): void => {
  localStorage.setItem(COMMAND_PALETTE_SETTINGS_KEY, String(enabled));
  notifyListeners();
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const onStorage = (e: StorageEvent) => {
  if (e.key === COMMAND_PALETTE_SETTINGS_KEY) notifyListeners();
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
 * Hook to manage the command palette enable/disable toggle with localStorage persistence.
 * Defaults to enabled — cmd+k is a conventional, modifier-gated shortcut, not a one-key trap.
 */
export const useCommandPaletteSettings = () => {
  const enabled = useSyncExternalStore(subscribe, getSnapshot);

  return { enabled, setEnabled: storeValue };
};
