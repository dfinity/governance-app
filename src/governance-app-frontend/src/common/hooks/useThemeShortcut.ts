import { useEffect } from 'react';

import { Theme } from '@constants/theme';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const useThemeShortcut = () => {
  const { theme, setTheme } = useTheme();
  const { enabled } = useShortcutSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === 'd') setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme, enabled]);
};
