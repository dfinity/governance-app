import { type PointerEvent, useEffect, useRef } from 'react';

const DWELL_MS = 150;

const playIconMotion = async (row: HTMLElement) => {
  row.setAttribute('data-icon-play', '');
  // jsdom has no `getAnimations`.
  const animations = row.getAnimations?.({ subtree: true }) ?? [];
  await Promise.allSettled(animations.map(({ finished }) => finished));
  row.removeAttribute('data-icon-play');
};

/**
 * Pointer handlers for a navigation row. The icon motion in `main.css` plays once when the pointer
 * rests on the row, so a pointer that only crosses the row plays nothing. `data-icon-play` stays
 * until the motion ends: a pointer that leaves does not cut it, and one that comes back does not
 * restart it. Touch keeps the icon still.
 */
export const useIconMotion = () => {
  const dwell = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(dwell.current), []);

  return {
    onPointerEnter: ({ currentTarget, pointerType }: PointerEvent<HTMLElement>) => {
      if (pointerType === 'touch' || currentTarget.hasAttribute('data-icon-play')) return;

      clearTimeout(dwell.current);
      dwell.current = setTimeout(() => playIconMotion(currentTarget), DWELL_MS);
    },
    onPointerLeave: () => clearTimeout(dwell.current),
  };
};
