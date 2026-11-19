import { useSyncExternalStore } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

/** The control that opened the command palette, sent with the open event. */
export type CommandPaletteOpenSource = 'shortcut' | 'sidebar' | 'mobile_header';

let open = false;
// The element that had the focus when the palette opened. The palette has no trigger element, so
// Radix does not restore the focus by itself.
let returnFocusTarget: HTMLElement | null = null;
let listeners: Array<() => void> = [];

const notifyListeners = () => listeners.forEach((l) => l());

const subscribe = (listener: () => void) => {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

const getSnapshot = (): boolean => open;

export const openCommandPalette = (source: CommandPaletteOpenSource): void => {
  if (open) return;
  analytics.event(AnalyticsEvent.CommandPaletteOpen, { source });
  returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  open = true;
  notifyListeners();
};

export const closeCommandPalette = (): void => {
  if (!open) return;
  open = false;
  notifyListeners();
};

/**
 * Moves the focus back to the element that had it when the palette opened. Returns false when that
 * element left the page, for example after a navigation.
 */
export const restoreCommandPaletteFocus = (): boolean => {
  const target = returnFocusTarget;
  returnFocusTarget = null;
  if (!target?.isConnected) return false;
  target.focus();
  return true;
};

/** Whether the command palette is open. The shortcut and the buttons share this state. */
export const useCommandPaletteOpen = (): boolean => useSyncExternalStore(subscribe, getSnapshot);
