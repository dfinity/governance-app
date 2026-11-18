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
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SIDEBAR_COLLAPSED_KEY } from '@constants/extra';

import { Sidebar } from './Sidebar';

const mocks = vi.hoisted(() => ({ shortcutsEnabled: false }));

vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({ features: {} }),
}));
vi.mock('@hooks/useShortcutSettings', () => ({
  useShortcutSettings: () => ({ enabled: mocks.shortcutsEnabled }),
}));
vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => 'rrkah-fqaaa-aaaaa-aaaaq-cai' }) },
  }),
}));
vi.mock('@hooks/useLogout', () => ({ useLogout: () => vi.fn() }));
vi.mock('@hooks/useSessionTimeLeft', () => ({ useSessionTimeLeft: () => null }));

/** An in-memory `localStorage`: the one of the test environment has no `setItem`. */
const createStorage = (entries: Record<string, string> = {}) => {
  const items = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
    items,
  };
};

const renderSidebar = async () => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <Sidebar />
      </>
    ),
  });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => <p>page</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  });

  render(<RouterProvider router={router as never} />);
  await waitFor(() => expect(screen.getByText('page')).toBeTruthy());
};

describe('Sidebar', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.shortcutsEnabled = false;
  });

  it('shows the labels and the principal when expanded.', async () => {
    await renderSidebar();

    expect(screen.getByText('Dashboard').className).not.toContain('sr-only');
    expect(screen.getByText('rrkah-f...aaq-cai')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy();
  });

  it('collapses to the icons and stores the state.', async () => {
    await renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(storage.items.get(SIDEBAR_COLLAPSED_KEY)).toBe('true');
    expect(screen.getByRole('complementary').dataset.collapsed).toBe('true');
    // The link keeps its name for screen readers.
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeTruthy();
    expect(screen.queryByText('rrkah-f...aaq-cai')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
  });

  it('starts collapsed when the stored state is collapsed.', async () => {
    vi.stubGlobal('localStorage', createStorage({ [SIDEBAR_COLLAPSED_KEY]: 'true' }));
    await renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(screen.getByRole('complementary').dataset.collapsed).toBeUndefined();
    expect(screen.getByText('rrkah-f...aaq-cai')).toBeTruthy();
  });

  it('hides the shortcut key when the keyboard shortcuts are off.', async () => {
    await renderSidebar();
    expect(screen.queryByText('[')).toBeNull();
  });

  it('shows the shortcut key when the keyboard shortcuts are on.', async () => {
    mocks.shortcutsEnabled = true;
    await renderSidebar();

    expect(screen.getByText('[')).toBeTruthy();
  });
});
