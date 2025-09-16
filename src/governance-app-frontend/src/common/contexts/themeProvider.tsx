import { ReactNode, useEffect, useState } from 'react';

import { Theme, ThemeContext } from '@contexts/themeContext';
import { STORAGE_KEYS } from '@utils/storageKeys';

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * The default theme to use if no theme is stored in localStorage
   * @default "system"
   */
  defaultTheme?: Theme;
}

const DARK_MODE_CLASS = 'dark-mode';

export const ThemeProvider = ({ children, defaultTheme = 'system' }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
      return savedTheme || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

        root.classList.toggle(DARK_MODE_CLASS, systemTheme === 'dark');
        localStorage.removeItem(STORAGE_KEYS.THEME);
      } else {
        root.classList.toggle(DARK_MODE_CLASS, theme === 'dark');
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
