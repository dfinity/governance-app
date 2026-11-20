import { useEffect } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Theme } from '@constants/theme';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useTheme } from '@hooks/useTheme';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const THEME_SHORTCUT_KEY = 'd';

/** The theme that the shortcut applies when the current theme is `theme`. */
export const getShortcutTheme = (theme: Theme): Theme =>
  theme === Theme.Dark ? Theme.Light : Theme.Dark;

export const useThemeShortcut = () => {
  const { theme, setTheme } = useTheme();
  const { enabled } = useShortcutSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === THEME_SHORTCUT_KEY) {
        analytics.event(AnalyticsEvent.ShortcutUsed, { shortcut: 'theme' });
        setTheme(getShortcutTheme(theme));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme, enabled]);
};
