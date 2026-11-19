import { useSyncExternalStore } from 'react';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

/** The control that opened the command palette, sent with the open event. */
export type CommandPaletteOpenSource = 'shortcut' | 'sidebar' | 'mobile_header';

let open = false;
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
  open = true;
  notifyListeners();
};

export const closeCommandPalette = (): void => {
  if (!open) return;
  open = false;
  notifyListeners();
};

/** Whether the command palette is open. The shortcut and the buttons share this state. */
export const useCommandPaletteOpen = (): boolean => useSyncExternalStore(subscribe, getSnapshot);
