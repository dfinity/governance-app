import { useInternetIdentity } from 'ic-use-internet-identity';
import { useCallback, useEffect } from 'react';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const useLogoutShortcut = () => {
  const { identity, clear } = useInternetIdentity();

  const handleLogout = useCallback(() => {
    if (!identity) return;

    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  }, [identity, clear]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === 'u') handleLogout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLogout]);
};
