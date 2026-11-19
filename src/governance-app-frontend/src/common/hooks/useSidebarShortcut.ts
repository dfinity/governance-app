import { useEffect } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useSidebarCollapsed } from '@hooks/useSidebarCollapsed';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const SIDEBAR_SHORTCUT_KEY = '[';

export const useSidebarShortcut = () => {
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const { enabled } = useShortcutSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (shouldIgnoreKeyboardShortcut(event, { layoutModifiers: true })) return;

      if (event.key === SIDEBAR_SHORTCUT_KEY) {
        analytics.event(AnalyticsEvent.ShortcutUsed, { shortcut: 'sidebar' });
        setCollapsed(!collapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, setCollapsed, enabled]);
};
