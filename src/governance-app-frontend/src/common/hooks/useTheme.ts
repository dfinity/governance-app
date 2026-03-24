import { useEffect, useSyncExternalStore } from 'react';

import { THEME_STORAGE_KEY } from '@constants/extra';
import { Theme } from '@constants/theme';

const DARK_MQ = '(prefers-color-scheme: dark)';
const getStoredTheme = (): Theme => {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
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
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  notifyListeners();
};

const onStorage = (e: StorageEvent) => {
  if (e.key === THEME_STORAGE_KEY) notifyListeners();
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

const subscribeSystemTheme = (cb: () => void) => {
  const mql = window.matchMedia(DARK_MQ);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};

const getSystemThemeSnapshot = () => window.matchMedia(DARK_MQ).matches;

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  const isSystemDark = useSyncExternalStore(subscribeSystemTheme, getSystemThemeSnapshot);

  const resolvedTheme = theme === Theme.System ? (isSystemDark ? Theme.Dark : Theme.Light) : theme;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(Theme.Light, Theme.Dark);
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return { theme, setTheme: storeTheme };
};
