import { useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef } from 'react';

/** Scroll position of the main element, by history entry key. */
const positions = new Map<string, number>();

/** How long a restore keeps waiting for the page content to grow. */
const RESTORE_WINDOW_MS = 5000;

const getMain = () => document.querySelector('main');

const noop = () => {};

/**
 * Scrolls the main element to `top`.
 *
 * If the content is still shorter than that (a list that loads again after its
 * cache expired), the browser clamps the position. The restore then retries as
 * the content grows, until the position fits, the user scrolls, or the window
 * ends. Returns a function that stops the retries.
 */
const restorePosition = (main: HTMLElement, top: number): (() => void) => {
  main.scrollTo({ top, left: 0 });
  const content = main.firstElementChild;
  if (main.scrollTop >= top || !content) return noop;

  let lastSet = main.scrollTop;
  const stop = () => {
    observer.disconnect();
    clearTimeout(timer);
  };
  const observer = new ResizeObserver(() => {
    // A position we did not set means the user scrolled. Leave it.
    if (main.scrollTop !== lastSet) {
      stop();
      return;
    }
    main.scrollTo({ top, left: 0 });
    lastSet = main.scrollTop;
    if (lastSet >= top) stop();
  });
  observer.observe(content);
  const timer = setTimeout(stop, RESTORE_WINDOW_MS);
  return stop;
};

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
 * shorter pending page cannot clamp it. A restore waits for late content, see
 * `restorePosition`.
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
  const stopRestore = useRef(noop);

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

    const main = getMain();
    if (!main) return;
    const key = resolvedLocation.state.__TSR_key;
    const top = key ? (positions.get(key) ?? 0) : 0;
    stopRestore.current();
    stopRestore.current = restorePosition(main, top);
  }, [resolvedLocation]);

  useEffect(() => () => stopRestore.current(), []);
};
