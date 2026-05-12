import { useEffect } from 'react';

import { useCommandPaletteSettings } from '@hooks/useCommandPaletteSettings';

export const useCommandPaletteShortcut = (onTrigger: () => void) => {
  const { enabled } = useCommandPaletteSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (event.repeat) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey) return;
      if (event.key !== 'k' && event.key !== 'K') return;

      event.preventDefault();
      onTrigger();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onTrigger]);
};
