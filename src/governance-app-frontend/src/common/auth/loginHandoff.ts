import { useSyncExternalStore } from 'react';

/**
 * Whether the login hand-off frame covers the page. The route under it can mount dialogs and
 * listen for shortcuts, so they wait until the frame leaves.
 */
let active = false;
const listeners = new Set<() => void>();

export const isLoginHandoffActive = (): boolean => active;

export const setLoginHandoffActive = (next: boolean) => {
  if (next === active) return;
  active = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useIsLoginHandoffActive = (): boolean =>
  useSyncExternalStore(subscribe, isLoginHandoffActive);
