import { useContext } from 'react';

import { ThemeContext } from '@contexts/themeContext';

export type Theme = 'light' | 'dark';

export const useTheme = (): ThemeContext & {
  theme: Theme;
} => {
  const context = useContext(ThemeContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  const theme: Theme =
    context.themePreference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : (context.themePreference as 'light' | 'dark');

  return {
    ...context,
    theme,
  };
};
