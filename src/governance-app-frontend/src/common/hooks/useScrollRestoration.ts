import { useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef } from 'react';

/** Scroll position of the main element, by history entry key. */
const positions = new Map<string, number>();

const getMain = () => document.querySelector('main');

/**
 * Keeps the scroll position of the main element per history entry.
 *
 * A new page starts at the top. A page reached with the browser's back or forward
 * button (or `router.history.back()`) returns to where the user left it.
 * Query params and hash/fragment changes keep the current position, since we are
 * in the same page.
 *
 * Replaces the scrollRestoration prop from TanStack Router, because it didn't work
 * consistently: sometimes didn't reset the scroll position on page change.
 *
 * The position is saved in `onBeforeNavigate`, before the new page renders, so a
 * shorter pending page cannot clamp it.
 *
 * Uses `resolvedLocation` instead of `location` so the scroll only changes after
 * navigation fully resolves (loaders + component ready), preventing the old page
 * from visibly scrolling before the new content appears.
 *
 * Uses useLayoutEffect so the scroll changes synchronously before the browser paints.
 */
export const useScrollRestoration = () => {
  const router = useRouter();
  const resolvedLocation = useRouterState({ select: (s) => s.resolvedLocation });
  const previousPathname = useRef(resolvedLocation?.pathname);

  useEffect(
    () =>
      router.subscribe('onBeforeNavigate', ({ fromLocation }) => {
        const key = fromLocation?.state.__TSR_key;
        const main = getMain();
        if (key && main) positions.set(key, main.scrollTop);
      }),
    [router],
  );

  useLayoutEffect(() => {
    if (!resolvedLocation || previousPathname.current === resolvedLocation.pathname) return;
    previousPathname.current = resolvedLocation.pathname;

    const key = resolvedLocation.state.__TSR_key;
    const top = key ? (positions.get(key) ?? 0) : 0;
    getMain()?.scrollTo({ top, left: 0 });
  }, [resolvedLocation]);
};
