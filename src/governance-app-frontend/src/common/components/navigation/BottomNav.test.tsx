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

import { BottomNav } from './BottomNav';

vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({ features: {} }),
}));

const renderAt = async (path: string) => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <BottomNav />
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

describe('BottomNav', () => {
  it('shows on a page without the hidesBottomNav flag', async () => {
    await renderAt('/page');

    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  it('does not show on a page with the hidesBottomNav flag', async () => {
    await renderAt('/detail');

    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
