import { useEffect } from 'react';

import { Theme } from '@contexts/themeContext';
import { useTheme } from '@hooks/useTheme';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const useThemeShortcut = () => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === 'd') setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme]);
};
