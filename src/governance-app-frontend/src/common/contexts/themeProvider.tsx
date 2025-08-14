import { ReactNode, useEffect, useState } from 'react';

import { Theme, ThemeContext } from '@/common/contexts/themeContext';
import { STORAGE_KEYS } from '@/common/utils/storageKeys';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Sync with other tabs via localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.THEME && e.newValue) {
        setTheme(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === Theme.Light ? Theme.Dark : Theme.Light));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return Theme.Light;

  const storedValue = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
  if (storedValue !== null) return storedValue;

  // Try to match the system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? Theme.Dark : Theme.Light;
}
