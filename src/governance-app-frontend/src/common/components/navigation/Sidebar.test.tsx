import '@/i18n/config';

import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from './Sidebar';

const { login, setLoginSource } = vi.hoisted(() => ({
  login: vi.fn(),
  setLoginSource: vi.fn(),
}));

vi.mock('@hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({ features: {} }),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: undefined,
    canLogin: true,
    isLoggingIn: false,
    login,
  }),
}));

vi.mock('@features/analytics/useLoginAnalytics', () => ({ setLoginSource }));

const renderSidebar = async (variant?: 'app' | 'reader') => {
  const rootRoute = createRootRoute({ component: () => <Sidebar variant={variant} /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  render(<RouterProvider router={router as never} />);
  await waitFor(() => expect(screen.getByRole('complementary')).toBeTruthy());
};

describe('Sidebar', () => {
  beforeEach(() => {
    login.mockClear();
    setLoginSource.mockClear();
  });

  it('shows the navigation by default, also without a session', async () => {
    await renderSidebar();

    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('reader-intro')).toBeNull();
  });

  it('shows an intro and one login, and no links, to a reader', async () => {
    await renderSidebar('reader');

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByRole('region', { name: 'About the Network Nervous System' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('starts the login from the sidebar', async () => {
    await renderSidebar('reader');

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(setLoginSource).toHaveBeenCalledWith('reader_sidebar');
    expect(login).toHaveBeenCalledTimes(1);
  });
});
