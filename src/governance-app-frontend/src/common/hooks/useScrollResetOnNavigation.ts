import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * Resets the scroll position of the main element when the page changes.
 * Query params and hash/fragment changes are ignored, since we are in the same page.
 * Replaces the scrollRestoration prop from TanStack Router, because it didn't work consistently:
 * sometimes didn't reset the scroll position on page change.
 */
export const useScrollResetOnNavigation = () => {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      document.querySelector('main')?.scrollTo({ top: 0, left: 0 });
      previousPathname.current = pathname;
    }
  }, [pathname]);
};
