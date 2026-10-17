import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  restoresScrollPosition,
  SCROLL_RESTORE_TIMEOUT_MS,
  useScrollResetOnNavigation,
} from './useScrollResetOnNavigation';

// jsdom has no ResizeObserver. The fake lets a test tell the hook that the content resized.
const resizeCallbacks = new Set<() => void>();
vi.stubGlobal(
  'ResizeObserver',
  class {
    private callback: () => void;
    constructor(callback: () => void) {
      this.callback = callback;
    }
    observe() {
      resizeCallbacks.add(this.callback);
    }
    unobserve() {}
    disconnect() {
      resizeCallbacks.delete(this.callback);
    }
  },
);

const resizeContent = () => act(() => resizeCallbacks.forEach((callback) => callback()));

// jsdom does no layout, so `<main>` gets a scroll range that each test can change.
let maxScrollTop = 1000;
let scrollTop = 0;

const fakeMainScroll = (main: HTMLElement) =>
  Object.defineProperty(main, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = Math.min(Math.max(value, 0), maxScrollTop);
    },
  });

const userScroll = (main: HTMLElement, top: number) => {
  main.scrollTop = top;
  main.dispatchEvent(new Event('scroll'));
};

const createTestRouter = () => {
  const rootRoute = createRootRoute({
    component: function Layout() {
      useScrollResetOnNavigation();
      return (
        <main>
          <div>
            <Outlet />
          </div>
        </main>
      );
    },
  });
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/list',
    validateSearch: (search: Record<string, unknown>) => ({
      filter: typeof search.filter === 'string' ? search.filter : undefined,
    }),
    component: () => <p>List</p>,
  });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/detail',
    component: () => <p>Detail</p>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([listRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/list'] }),
  });
};

type TestRouter = ReturnType<typeof createTestRouter>;

const renderRouter = async () => {
  const router = createTestRouter();
  render(<RouterProvider router={router} />);
  await screen.findByText('List');

  const main = document.querySelector('main')!;
  fakeMainScroll(main);
  return { router, main };
};

const waitForPage = async (router: TestRouter, pathname: string) => {
  await screen.findByText(pathname === '/list' ? 'List' : 'Detail');
  await waitFor(() => expect(router.state.resolvedLocation?.pathname).toBe(pathname));
};

const goBack = async (router: TestRouter, pathname: string) => {
  act(() => router.history.back());
  await waitForPage(router, pathname);
};

// The app registers its own route tree, so the test router navigates with untyped paths.
const openDetail = async (router: TestRouter) => {
  act(() => router.history.push('/detail'));
  await waitForPage(router, '/detail');
};

const changeFilter = async (router: TestRouter) => {
  act(() => router.history.replace('/list?filter=all'));
  await waitFor(() => expect(router.state.resolvedLocation?.search).toEqual({ filter: 'all' }));
};

describe('useScrollResetOnNavigation', () => {
  beforeEach(() => {
    maxScrollTop = 1000;
    scrollTop = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    resizeCallbacks.clear();
  });

  it('Starts a new page at the top.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 500);

    await openDetail(router);

    expect(main.scrollTop).toBe(0);
  });

  it('Keeps the position when only the search params change.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 500);

    await changeFilter(router);

    expect(main.scrollTop).toBe(500);
  });

  it('Restores the position of each page on Back and Forward.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 500);
    await openDetail(router);
    userScroll(main, 200);

    await goBack(router, '/list');
    expect(main.scrollTop).toBe(500);

    act(() => router.history.forward());
    await waitForPage(router, '/detail');
    expect(main.scrollTop).toBe(200);
  });

  it('Restores the position of the entry after a search param change.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 500);
    // A replace makes a new history entry key. The user does not scroll after it.
    await changeFilter(router);
    await openDetail(router);

    await goBack(router, '/list');

    expect(main.scrollTop).toBe(500);
  });

  it('Restores the position when the content grows after the page resolves.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 800);
    await openDetail(router);

    // The list data is not loaded yet, so the page is too short.
    maxScrollTop = 300;
    await goBack(router, '/list');
    expect(main.scrollTop).toBe(300);

    maxScrollTop = 1000;
    resizeContent();

    expect(main.scrollTop).toBe(800);
  });

  it('Stops the restore when the user scrolls.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 800);
    await openDetail(router);
    maxScrollTop = 300;
    await goBack(router, '/list');

    window.dispatchEvent(new Event('touchstart'));
    userScroll(main, 100);
    maxScrollTop = 1000;
    resizeContent();

    expect(main.scrollTop).toBe(100);
  });

  it('Saves the position on screen when the user stops the restore.', async () => {
    const { router, main } = await renderRouter();
    userScroll(main, 800);
    await openDetail(router);
    maxScrollTop = 300;
    await goBack(router, '/list');

    // A tap with no scroll after it, then the list data loads.
    window.dispatchEvent(new Event('pointerdown'));
    maxScrollTop = 1000;
    resizeContent();
    await openDetail(router);
    await goBack(router, '/list');

    expect(main.scrollTop).toBe(300);
  });

  it('Stops the restore after the timeout.', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { router, main } = await renderRouter();
    userScroll(main, 800);
    await openDetail(router);
    maxScrollTop = 300;
    await goBack(router, '/list');

    act(() => vi.advanceTimersByTime(SCROLL_RESTORE_TIMEOUT_MS));
    maxScrollTop = 1000;
    resizeContent();
    expect(main.scrollTop).toBe(300);

    await openDetail(router);
    await goBack(router, '/list');
    expect(main.scrollTop).toBe(300);
  });

  it('Tells the page when Back restores its position.', async () => {
    const { router } = await renderRouter();
    const currentKey = () => router.state.location.state.__TSR_key;
    expect(restoresScrollPosition(currentKey())).toBe(false);

    await openDetail(router);
    expect(restoresScrollPosition(currentKey())).toBe(false);

    await goBack(router, '/list');
    expect(restoresScrollPosition(currentKey())).toBe(true);

    await openDetail(router);
    expect(restoresScrollPosition(currentKey())).toBe(false);
  });
});
