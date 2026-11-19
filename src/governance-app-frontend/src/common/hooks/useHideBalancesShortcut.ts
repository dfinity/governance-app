import { useEffect } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useHideBalances } from '@hooks/useHideBalances';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const HIDE_BALANCES_SHORTCUT_KEY = 'p';

export const useHideBalancesShortcut = () => {
  const { hidden, setHidden } = useHideBalances();
  const { enabled } = useShortcutSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === HIDE_BALANCES_SHORTCUT_KEY) {
        analytics.event(AnalyticsEvent.ShortcutUsed, { shortcut: 'hide_balances' });
        setHidden(!hidden);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hidden, setHidden, enabled]);
};
