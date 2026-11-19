import { useEffect } from 'react';

import { useCommandPaletteSettings } from '@hooks/useCommandPaletteSettings';
import { isLoginHandoffActive } from '@common/auth/loginHandoff';

const OPEN_DIALOG_SELECTOR = ['dialog', 'drawer', 'alert-dialog']
  .map((slot) => `[data-slot="${slot}-content"][data-state="open"]`)
  .join(', ');

// The palette is a dialog too. Cmd+K must still close it.
const isOtherDialogOpen = () =>
  [...document.querySelectorAll(OPEN_DIALOG_SELECTOR)].some(
    (dialog) => !dialog.querySelector('[cmdk-root]'),
  );

export const useCommandPaletteShortcut = (onTrigger: () => void) => {
  const { enabled } = useCommandPaletteSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled || isLoginHandoffActive()) return;
      if (event.repeat) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey) return;
      if (event.key !== 'k' && event.key !== 'K') return;

      event.preventDefault();
      // A command can discard a form or sign out during a transaction.
      if (isOtherDialogOpen()) return;
      onTrigger();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onTrigger]);
};
