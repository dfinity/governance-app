import { useInternetIdentity } from 'ic-use-internet-identity';
import { useCallback, useEffect } from 'react';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

export const useLogoutShortcut = () => {
  const { identity, clear } = useInternetIdentity();

  const handleLogout = useCallback(() => {
    if (!identity) return;

    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  }, [identity, clear]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key repeats and modifier combinations (e.g. Ctrl+U, Cmd+U)
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      // Ignore if the user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
        return;

      if (event.key === 'u') handleLogout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLogout]);
};
