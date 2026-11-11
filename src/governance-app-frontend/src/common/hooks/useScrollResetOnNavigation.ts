import { useRouterState } from '@tanstack/react-router';
import { useLayoutEffect, useRef } from 'react';

/**
 * Resets the scroll position when the page changes. The document scrolls on mobile and the main
 * element scrolls on desktop, so both reset.
 * Query params and hash/fragment changes are ignored, since we are in the same page.
 * Replaces the scrollRestoration prop from TanStack Router, because it didn't work consistently:
 * sometimes didn't reset the scroll position on page change.
 *
 * Uses `resolvedLocation` instead of `location` so the scroll only resets after
 * navigation fully resolves (loaders + component ready), preventing the old page
 * from visibly scrolling to top before the new content appears.
 *
 * Uses useLayoutEffect so the scroll resets synchronously before the browser paints.
 */
export const useScrollResetOnNavigation = () => {
  const resolvedPathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname,
  });
  const previousPathname = useRef(resolvedPathname);

  useLayoutEffect(() => {
    if (previousPathname.current !== resolvedPathname) {
      document.querySelector('main')?.scrollTo({ top: 0, left: 0 });
      window.scrollTo({ top: 0, left: 0 });
      previousPathname.current = resolvedPathname;
    }
  }, [resolvedPathname]);
};
