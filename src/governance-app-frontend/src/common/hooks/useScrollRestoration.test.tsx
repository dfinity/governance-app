import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollRestoration } from './useScrollRestoration';

const Layout = () => {
  useScrollRestoration();
  return (
    <main>
      <Outlet />
    </main>
  );
};

const rootRoute = createRootRoute({ component: Layout });
const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/list',
  component: () => <p>list</p>,
});
const detailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/details',
  component: () => <p>details</p>,
});

const scrollTo = vi.fn();

/** The tallest position the content allows, as the browser would clamp it. */
let maxScrollTop = Infinity;

/** Observers the hook made, in order. A stopped restore disconnects its observer. */
const observers: { callback: ResizeObserverCallback; active: boolean }[] = [];
const contentResized = () =>
  observers.filter((o) => o.active).forEach((o) => o.callback([], {} as ResizeObserver));
const contentGrew = () => {
  maxScrollTop = Infinity;
  contentResized();
};

const setup = async () => {
  const history = createMemoryHistory({ initialEntries: ['/list'] });
  const router = createRouter({
    routeTree: rootRoute.addChildren([listRoute, detailsRoute]),
    history,
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.resolvedLocation?.pathname).toBe('/list'));
  // The first resolved page also starts at the top. The tests cover what follows.
  scrollTo.mockClear();

  const main = document.querySelector('main')!;
  const go = async (move: () => void, pathname: string) => {
    await act(async () => move());
    await waitFor(() => expect(router.state.resolvedLocation?.pathname).toBe(pathname));
  };

  return { history, main, go };
};

describe('useScrollRestoration', () => {
  beforeEach(() => {
    // jsdom has no Element.scrollTo. Mirror the clamped position so a restore can read it back.
    HTMLElement.prototype.scrollTo = scrollTo.mockImplementation(function (
      this: HTMLElement,
      options?: ScrollToOptions | number,
    ) {
      if (typeof options === 'object' && options.top !== undefined) {
        this.scrollTop = Math.min(options.top, maxScrollTop);
      }
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly entry: (typeof observers)[number];
        constructor(callback: ResizeObserverCallback) {
          this.entry = { callback, active: true };
          observers.push(this.entry);
        }
        observe() {}
        disconnect() {
          this.entry.active = false;
        }
      },
    );
  });

  afterEach(() => {
    scrollTo.mockReset();
    vi.unstubAllGlobals();
    maxScrollTop = Infinity;
    observers.length = 0;
  });

  it('starts a new page at the top', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;

    await go(() => history.push('/details'), '/details');

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  it('returns a page to its position on a history move back', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;
    await go(() => history.push('/details'), '/details');
    main.scrollTop = 120;

    await go(() => history.back(), '/list');
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 300, left: 0 });

    await go(() => history.forward(), '/details');
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 120, left: 0 });
  });

  it('starts at the top when the same page is pushed again', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;
    await go(() => history.push('/details'), '/details');

    await go(() => history.push('/list'), '/list');

    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0 });
  });

  it('restores the position once late content makes room for it', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;
    await go(() => history.push('/details'), '/details');

    maxScrollTop = 100;
    await go(() => history.back(), '/list');
    expect(main.scrollTop).toBe(100);

    act(contentGrew);
    expect(main.scrollTop).toBe(300);
  });

  it('keeps retrying when the content shrinks before it grows', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;
    await go(() => history.push('/details'), '/details');

    maxScrollTop = 100;
    await go(() => history.back(), '/list');

    // A loading section ends, and the browser clamps the position again.
    maxScrollTop = 60;
    main.scrollTop = 60;
    act(contentResized);
    expect(main.scrollTop).toBe(60);

    act(contentGrew);
    expect(main.scrollTop).toBe(300);
  });

  it('stops retrying once the user gives input during a restore', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;
    await go(() => history.push('/details'), '/details');

    maxScrollTop = 100;
    await go(() => history.back(), '/list');
    main.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    main.scrollTop = 40;

    act(contentGrew);
    expect(main.scrollTop).toBe(40);
  });

  it('keeps the position when only the search params change', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;

    await go(() => history.replace('/list?filter=all'), '/list');

    expect(scrollTo).not.toHaveBeenCalled();
    expect(main.scrollTop).toBe(300);
  });
});
