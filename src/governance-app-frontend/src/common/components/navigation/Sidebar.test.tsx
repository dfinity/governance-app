import '@/i18n/config';

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMAND_PALETTE_SETTINGS_KEY, SIDEBAR_COLLAPSED_KEY } from '@constants/extra';
import { registerCommandPalette } from '@hooks/useCommandPaletteOpen';
import { useSidebarShortcut } from '@hooks/useSidebarShortcut';

import { Sidebar } from './Sidebar';

// The real Radix tooltip, so the tests cover when a row label shows.
vi.unmock('@components/Tooltip');

// Radix positions the tooltip with ResizeObserver, which jsdom does not have. `afterEach` removes
// stubbed globals, so this is a plain assignment.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({ features: {} }),
}));
vi.mock('@hooks/useShortcutSettings', () => ({
  useShortcutSettings: () => ({ enabled: true }),
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));
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

/** The `[` shortcut is the only way to toggle the sidebar. */
const ShortcutSidebar = () => {
  useSidebarShortcut();
  return <Sidebar />;
};

const renderSidebar = async () => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <ShortcutSidebar />
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

const pressToggleKey = (target: EventTarget = document.body) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true }));
  });

describe('Sidebar', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the labels and the principal when expanded.', async () => {
    await renderSidebar();

    expect(screen.getByText('Dashboard').className).not.toContain('sr-only');
    expect(screen.getByText('rrkah-f...aaq-cai')).toBeTruthy();
  });

  it('has no toggle button.', async () => {
    await renderSidebar();

    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Logout']);
  });

  it('collapses to the icons on the shortcut and stores the state.', async () => {
    await renderSidebar();

    pressToggleKey();

    expect(storage.items.get(SIDEBAR_COLLAPSED_KEY)).toBe('true');
    expect(screen.getByRole('complementary').dataset.collapsed).toBe('true');
    // The link keeps its name for screen readers.
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeTruthy();
    expect(screen.queryByText('rrkah-f...aaq-cai')).toBeNull();
  });

  it('starts collapsed when the stored state is collapsed.', async () => {
    vi.stubGlobal('localStorage', createStorage({ [SIDEBAR_COLLAPSED_KEY]: 'true' }));
    await renderSidebar();
    expect(screen.getByRole('complementary').dataset.collapsed).toBe('true');

    pressToggleKey();

    expect(screen.getByRole('complementary').dataset.collapsed).toBeUndefined();
    expect(screen.getByText('rrkah-f...aaq-cai')).toBeTruthy();
  });

  it('shows the search button while the command palette is on.', async () => {
    const unregister = registerCommandPalette();
    await renderSidebar();

    expect(screen.getByRole('button', { name: /Search/ })).toBeTruthy();
    unregister();
  });

  it('hides the search button while the command palette is off.', async () => {
    const unregister = registerCommandPalette();
    vi.stubGlobal('localStorage', createStorage({ [COMMAND_PALETTE_SETTINGS_KEY]: 'false' }));
    await renderSidebar();

    expect(screen.queryByRole('button', { name: /Search/ })).toBeNull();
    unregister();
  });

  it('hides the search button on a screen without a palette.', async () => {
    await renderSidebar();

    expect(screen.queryByRole('button', { name: /Search/ })).toBeNull();
  });

  it('keeps the keyboard focus on a row.', async () => {
    await renderSidebar();
    const link = screen.getByRole('link', { name: /Dashboard/ });
    link.focus();

    pressToggleKey(link);

    expect(screen.getByRole('complementary').dataset.collapsed).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /Dashboard/ }));
  });

  it('collapses when the browser denies the storage.', async () => {
    const denied = () => {
      throw new DOMException('Denied', 'SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied });
    await renderSidebar();

    pressToggleKey();

    expect(screen.getByRole('complementary').dataset.collapsed).toBe('true');
  });

  it('shows the label of a row on hover when collapsed.', async () => {
    vi.stubGlobal('localStorage', createStorage({ [SIDEBAR_COLLAPSED_KEY]: 'true' }));
    await renderSidebar();

    await userEvent.hover(screen.getByRole('link', { name: /Dashboard/ }));

    expect((await screen.findByRole('tooltip')).textContent).toBe('Dashboard');
  });

  it('does not show a label that was hovered while expanded.', async () => {
    await renderSidebar();
    const link = screen.getByRole('link', { name: /Dashboard/ });
    await userEvent.hover(link);
    await userEvent.unhover(link);

    pressToggleKey();

    expect(screen.queryByRole('tooltip', { name: 'Dashboard' })).toBeNull();
  });
});
