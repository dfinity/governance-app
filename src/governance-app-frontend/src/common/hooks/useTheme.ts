import { useEffect, useSyncExternalStore } from 'react';

import { THEME_STORAGE_KEY } from '@constants/extra';
import { Theme } from '@constants/theme';

const getStoredTheme = (): Theme => {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    if (Object.values(Theme).includes(theme as Theme)) return theme as Theme;
  } catch {
    // ignore
  }
  return Theme.Light;
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

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(Theme.Light, Theme.Dark);

    if (theme === Theme.Dark) {
      root.dataset.theme = Theme.Dark;
      return;
    }

    root.removeAttribute('data-theme');
  }, [theme]);

  return { theme, setTheme: storeTheme };
};
