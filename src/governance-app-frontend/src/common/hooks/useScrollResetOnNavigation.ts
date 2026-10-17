import { AnyRouter, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef } from 'react';

/** How long a restore holds the saved position while the page content still loads. */
export const SCROLL_RESTORE_TIMEOUT_MS = 5000;

/** Input that tells the user scrolls on their own, so a restore must stop. */
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

const TRAVERSAL_ACTIONS: ReadonlySet<string> = new Set(['BACK', 'FORWARD', 'GO']);

/** The scroll position of `<main>` for each history entry, by `__TSR_key`. */
const savedScrollTops = new Map<string, number>();
/** The entry that the latest Back, Forward or Go led to. */
let traversedKey: string | undefined;
/** The entry whose saved position a restore holds. Scroll events must not overwrite it. */
let restoringKey: string | undefined;

/**
 * Tells if Back or Forward led to the history entry with `key` and the entry has a saved
 * scroll position. The hook restores that position, so the page must not scroll on its own.
 */
export const restoresScrollPosition = (key: string | undefined): boolean =>
  key !== undefined && key === traversedKey && savedScrollTops.has(key);

/**
 * Saves `top` for the page on screen. While a navigation is pending, the page can change
 * under the old entry (a pending component, a clamped scroll), so nothing is saved then.
 */
const saveScrollTop = (router: AnyRouter, top: number) => {
  const { location, resolvedLocation } = router.state;
  const key = resolvedLocation?.state.__TSR_key;
  if (!key || key !== location.state.__TSR_key || key === restoringKey) return;

  savedScrollTops.set(key, top);
};

/**
 * Scrolls `main` to `top` and does it again each time the content resizes, because lists can
 * load after the route resolves. Stops after a timeout or when the user scrolls, and then saves
 * the position on screen. Returns the function that stops the restore without a save.
 */
const restoreScrollTop = (router: AnyRouter, main: HTMLElement, key: string, top: number) => {
  const apply = () => {
    main.scrollTop = top;
  };
  const observer = new ResizeObserver(apply);
  const stop = () => {
    observer.disconnect();
    clearTimeout(timeout);
    USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, finish, true));
    if (restoringKey === key) restoringKey = undefined;
  };
  // The content can still be too short for `top`, so the user can see a lower position.
  const finish = () => {
    stop();
    saveScrollTop(router, main.scrollTop);
  };
  const timeout = setTimeout(finish, SCROLL_RESTORE_TIMEOUT_MS);

  restoringKey = key;
  apply();
  if (main.firstElementChild) observer.observe(main.firstElementChild);
  USER_SCROLL_EVENTS.forEach((type) =>
    window.addEventListener(type, finish, { capture: true, passive: true }),
  );

  return stop;
};

/**
 * Sets the scroll position of the main element when the page changes.
 * - A new history entry (push or replace) starts at the top.
 * - Back and Forward restore the position that the entry had when the user left it.
 * Query params and hash/fragment changes are ignored, since we are in the same page.
 * Replaces the scrollRestoration prop from TanStack Router, because it didn't work consistently:
 * sometimes didn't reset the scroll position on page change.
 *
 * Uses `resolvedLocation` instead of `location` so the scroll only changes after
 * navigation fully resolves (loaders + component ready), preventing the old page
 * from visibly scrolling to top before the new content appears.
 *
 * Uses useLayoutEffect so the scroll changes synchronously before the browser paints.
 */
export const useScrollResetOnNavigation = () => {
  const router = useRouter();
  const resolvedPathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname,
  });
  const resolvedKey = useRouterState({
    select: (s) => s.resolvedLocation?.state.__TSR_key,
  });
  const previousPathname = useRef(resolvedPathname);

  useEffect(
    () =>
      router.history.subscribe(({ action, location }) => {
        traversedKey = TRAVERSAL_ACTIONS.has(action.type) ? location.state.__TSR_key : undefined;
      }),
    [router],
  );

  useEffect(() => {
    const onScroll = (event: Event) => {
      if (!(event.target instanceof HTMLElement) || event.target.tagName !== 'MAIN') return;
      saveScrollTop(router, event.target.scrollTop);
    };

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [router]);

  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!main || !resolvedKey) return;

    // Same page, new entry (a search param change): the position stays.
    if (previousPathname.current === resolvedPathname) {
      savedScrollTops.set(resolvedKey, main.scrollTop);
      return;
    }
    previousPathname.current = resolvedPathname;

    const savedTop = savedScrollTops.get(resolvedKey);
    if (savedTop !== undefined && resolvedKey === traversedKey) {
      return restoreScrollTop(router, main, resolvedKey, savedTop);
    }

    main.scrollTop = 0;
    savedScrollTops.set(resolvedKey, 0);
  }, [router, resolvedPathname, resolvedKey]);
};
