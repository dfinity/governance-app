import '@/i18n/config';

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MobileHeader } from './MobileHeader';

vi.mock('@hooks/useCommandPaletteSettings', () => ({
  useCommandPaletteSettings: () => ({ enabled: true }),
}));

const renderAt = async (path: string) => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <MobileHeader />
        <Outlet />
      </>
    ),
  });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/page',
    component: () => <p>page</p>,
  });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/detail',
    staticData: { hidesBottomNav: true },
    component: () => <p>detail</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  render(<RouterProvider router={router as never} />);
  await waitFor(() => expect(screen.getByText(path.slice(1))).toBeTruthy());
};

describe('MobileHeader', () => {
  it('shows the search button on a page.', async () => {
    await renderAt('/page');

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy();
  });

  it('does not show on a page with the hidesBottomNav flag.', async () => {
    await renderAt('/detail');

    expect(screen.queryByRole('banner')).toBeNull();
  });
});
