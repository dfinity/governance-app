import { useEffect, useSyncExternalStore } from 'react';

import { Theme } from '@constants/theme';

const STORAGE_KEY = 'vite-ui-theme';

const getStoredTheme = (): Theme => {
  try {
    const theme = localStorage.getItem(STORAGE_KEY);
    if (Object.values(Theme).includes(theme as Theme)) return theme as Theme;
  } catch {
    // ignore
  }
  return Theme.System;
};

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

const storeTheme = (theme: Theme): void => {
  localStorage.setItem(STORAGE_KEY, theme);
  notifyListeners();
};

const onStorage = (e: StorageEvent) => {
  if (e.key === STORAGE_KEY) notifyListeners();
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

const getSnapshot = (): Theme => getStoredTheme();

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(Theme.Light, Theme.Dark);

    if (theme === Theme.System) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? Theme.Dark
        : Theme.Light;
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme: storeTheme };
};
