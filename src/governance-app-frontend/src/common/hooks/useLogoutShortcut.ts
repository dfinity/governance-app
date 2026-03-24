import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect } from 'react';

import { useLogout } from '@hooks/useLogout';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const useLogoutShortcut = () => {
  const { identity } = useInternetIdentity();
  const { enabled } = useShortcutSettings();
  const logout = useLogout();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!identity || !enabled) return;
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === 'u') logout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [identity, logout, enabled]);
};
