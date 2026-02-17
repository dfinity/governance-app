import { useEffect, useSyncExternalStore } from 'react';

import { Theme } from '@constants/theme';

const STORAGE_KEY = 'vite-ui-theme';
const VALID_THEMES: Theme[] = [Theme.Dark, Theme.Light, Theme.System];

const getStoredTheme = (): Theme => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && VALID_THEMES.includes(raw as Theme)) return raw as Theme;
  } catch {
    // ignore
  }
  return Theme.System;
};

const storeTheme = (theme: Theme): void => {
  localStorage.setItem(STORAGE_KEY, theme);
  listeners.forEach((l) => l());
};

let listeners: Array<() => void> = [];

const subscribe = (listener: () => void) => {
  listeners = [...listeners, listener];

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listeners.forEach((l) => l());
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener('storage', onStorage);
  };
};

const getSnapshot = (): Theme => getStoredTheme();

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === Theme.System) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme: storeTheme };
};
