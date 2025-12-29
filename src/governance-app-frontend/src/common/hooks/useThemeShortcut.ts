import { useEffect } from 'react';

import { Theme } from '@contexts/themeContext';
import { useTheme } from '@hooks/useTheme';

export const useThemeShortcut = () => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if the user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
        return;

      if (event.key === 'd') setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme]);
};
