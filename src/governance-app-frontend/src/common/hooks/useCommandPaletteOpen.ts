import { useSyncExternalStore } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

/** The control that opened the command palette, sent with the open event. */
export type CommandPaletteOpenSource = 'shortcut' | 'sidebar' | 'mobile_header';

let open = false;
// The number of mounted palettes. Some signed-in screens, such as the 404 page, have none.
let mountedPalettes = 0;
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
const getMountedSnapshot = (): boolean => mountedPalettes > 0;

/** Marks a palette as mounted. The returned cleanup unmarks it and closes the palette. */
export const registerCommandPalette = (): (() => void) => {
  mountedPalettes += 1;
  notifyListeners();
  return () => {
    mountedPalettes -= 1;
    // The next session must not start with the palette open.
    open = false;
    notifyListeners();
  };
};

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

/** Whether a palette is mounted, so a button can open it. */
export const useCommandPaletteMounted = (): boolean =>
  useSyncExternalStore(subscribe, getMountedSnapshot);
