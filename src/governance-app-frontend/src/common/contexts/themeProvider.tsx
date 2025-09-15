import { ReactNode, useEffect, useState } from 'react';

import { Theme, ThemeContext } from '@contexts/themeContext';

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
  /**
   * The key to use to store the theme in localStorage
   * @default "ui-theme"
   */
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  darkModeClass = 'dark-mode',
}: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(storageKey) as Theme | null;
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
        localStorage.removeItem(storageKey);
      } else {
        root.classList.toggle(darkModeClass, theme === 'dark');
        localStorage.setItem(storageKey, theme);
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
