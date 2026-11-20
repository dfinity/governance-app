import { useSyncExternalStore } from 'react';

export type VisibleViewport = {
  /** The distance from the top of the layout viewport to the top of the visible area. */
  top: number;
  height: number;
};

const subscribe = (onChange: () => void) => {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener('resize', onChange);
  viewport.addEventListener('scroll', onChange);
  return () => {
    viewport.removeEventListener('resize', onChange);
    viewport.removeEventListener('scroll', onChange);
  };
};

const noSubscribe = () => () => {};

// A string snapshot stays equal while the visible area does not change, so React does not render
// again.
const getSnapshot = () => {
  const viewport = window.visualViewport;
  return viewport ? `${Math.round(viewport.offsetTop)} ${Math.round(viewport.height)}` : '';
};

const noSnapshot = () => '';

/**
 * The part of the layout viewport that the user sees. An on-screen keyboard makes it smaller, but
 * it does not change `vh` or `dvh` units. Returns `undefined` when `enabled` is false or the browser
 * has no `visualViewport`.
 */
export const useVisibleViewport = (enabled: boolean): VisibleViewport | undefined => {
  const snapshot = useSyncExternalStore(
    enabled ? subscribe : noSubscribe,
    enabled ? getSnapshot : noSnapshot,
    noSnapshot,
  );
  if (snapshot === '') return undefined;
  const [top, height] = snapshot.split(' ').map(Number);
  return { top, height };
};
