import { ReactNode, useEffect, useState } from 'react';

import { Theme, ThemeContext } from '@contexts/themeContext';
import { STORAGE_KEYS } from '@utils/storageKeys';

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * The class to add to the root element when the theme is dark
   * @default "dark-mode"
   */
  darkModeClass?: string;
  /**
   * The default theme to use if no theme is stored in localStorage
   * @default "system"
   */
  defaultTheme?: Theme;
}

export const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  darkModeClass = 'dark-mode',
}: ThemeProviderProps) => {
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

        root.classList.toggle(darkModeClass, systemTheme === 'dark');
        localStorage.removeItem(STORAGE_KEYS.THEME);
      } else {
        root.classList.toggle(darkModeClass, theme === 'dark');
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
    // https://www.untitledui.com/react/integrations/vite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
