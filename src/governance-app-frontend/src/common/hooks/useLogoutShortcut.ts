import { useEffect } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useLogout } from '@hooks/useLogout';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const useLogoutShortcut = () => {
  const { identity } = useInternetIdentity();
  const { enabled } = useShortcutSettings();
  const logout = useLogout('shortcut');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!identity || !enabled) return;
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === 'u') {
        analytics.event(AnalyticsEvent.ShortcutUsed, { shortcut: 'logout' });
        logout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [identity, logout, enabled]);
};
