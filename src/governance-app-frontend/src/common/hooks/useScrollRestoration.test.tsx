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
    // jsdom has no Element.scrollTo. Mirror the position so a restore can read it back.
    HTMLElement.prototype.scrollTo = scrollTo.mockImplementation(function (
      this: HTMLElement,
      options?: ScrollToOptions | number,
    ) {
      if (typeof options === 'object' && options.top !== undefined) this.scrollTop = options.top;
    });
  });

  afterEach(() => {
    scrollTo.mockReset();
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

  it('keeps the position when only the search params change', async () => {
    const { history, main, go } = await setup();
    main.scrollTop = 300;

    await go(() => history.replace('/list?filter=all'), '/list');

    expect(scrollTo).not.toHaveBeenCalled();
    expect(main.scrollTop).toBe(300);
  });
});
