import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * Resets the scroll position of the main element when the pathname changes.
 * Query params and hash/fragment changes are ignored.
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
