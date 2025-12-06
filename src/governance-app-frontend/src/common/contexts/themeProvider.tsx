import { ReactNode, useEffect, useState } from 'react';

import { ThemeContext, type ThemePreference } from '@contexts/themeContext';
import { STORAGE_KEYS } from '@utils/storage';

interface ThemeProviderProps {
  children: ReactNode;
}

const DARK_MODE_CLASS = 'dark';

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const savedTheme = localStorage?.getItem(STORAGE_KEYS.THEME) as ThemePreference | null;
    return savedTheme || 'system';
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.THEME && e.newValue) {
        setThemePreference(e.newValue as ThemePreference);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;

      if (themePreference === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

        root.classList.toggle(DARK_MODE_CLASS, systemTheme === 'dark');
        localStorage.removeItem(STORAGE_KEYS.THEME);
      } else {
        root.classList.toggle(DARK_MODE_CLASS, themePreference === 'dark');
        localStorage.setItem(STORAGE_KEYS.THEME, themePreference);
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themePreference === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};
