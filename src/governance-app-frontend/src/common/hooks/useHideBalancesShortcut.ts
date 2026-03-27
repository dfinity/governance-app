import { useEffect } from 'react';

import { useHideBalances } from '@hooks/useHideBalances';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { shouldIgnoreKeyboardShortcut } from '@utils/keyboard';

export const useHideBalancesShortcut = () => {
  const { hidden, setHidden } = useHideBalances();
  const { enabled } = useShortcutSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (shouldIgnoreKeyboardShortcut(event)) return;

      if (event.key === 'p') setHidden(!hidden);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hidden, setHidden, enabled]);
};
