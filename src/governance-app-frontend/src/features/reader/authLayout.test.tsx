import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { type ComponentType, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/voting/proposals/1',
  auth: {
    identity: undefined as object | undefined,
    isLoggingIn: false,
    isLoggingOut: false,
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createFileRoute: () => (options: object) => ({ options }),
  Outlet: () => <p>page</p>,
  useMatches: ({ select }: { select: (matches: { pathname: string }[]) => string }) =>
    select([{ pathname: '/' }, { pathname: mocks.pathname }]),
}));

vi.mock('@hooks/useInternetIdentity', () => ({ useInternetIdentity: () => mocks.auth }));

vi.mock('@components/MainLayout', () => ({
  MainLayout: ({ children, variant }: { children: ReactNode; variant: string }) => (
    <div data-testid={`layout-${variant}`}>{children}</div>
  ),
}));

vi.mock('@components/CommandPalette', () => ({ CommandPalette: () => <p>command palette</p> }));
vi.mock('@components/SessionCountdownToast', () => ({ SessionCountdownToast: () => null }));
vi.mock('@components/TransactionPollingWatcher', () => ({ TransactionPollingWatcher: () => null }));
vi.mock('@features/ledger/components/PendingDeviceActionDialog', () => ({
  PendingDeviceActionDialog: () => null,
}));

const signedInHooks = vi.hoisted(() => ({
  useLogoutShortcut: vi.fn(),
  useHideBalancesShortcut: vi.fn(),
  useNewFeatureCheck: vi.fn(),
  useAnalyticsProperties: vi.fn(),
  useClaimPendingDeviceStakes: vi.fn(),
}));

vi.mock('@hooks/useLogoutShortcut', () => ({ useLogoutShortcut: signedInHooks.useLogoutShortcut }));
vi.mock('@hooks/useHideBalancesShortcut', () => ({
  useHideBalancesShortcut: signedInHooks.useHideBalancesShortcut,
}));
vi.mock('@hooks/useNewFeatureCheck', () => ({
  useNewFeatureCheck: signedInHooks.useNewFeatureCheck,
}));
vi.mock('@features/analytics/useAnalyticsProperties', () => ({
  useAnalyticsProperties: signedInHooks.useAnalyticsProperties,
}));
vi.mock('@features/stakes/hooks/useClaimPendingDeviceStakes', () => ({
  useClaimPendingDeviceStakes: signedInHooks.useClaimPendingDeviceStakes,
}));
vi.mock('@hooks/useThemeShortcut', () => ({ useThemeShortcut: vi.fn() }));
vi.mock('@hooks/useScrollResetOnNavigation', () => ({ useScrollResetOnNavigation: vi.fn() }));
vi.mock('@features/analytics/useSignedInProperty', () => ({ useSignedInProperty: vi.fn() }));
vi.mock('@features/analytics/useLoginAnalytics', () => ({ useLoginAnalytics: vi.fn() }));
vi.mock('@utils/router', () => ({ requireIdentity: vi.fn() }));

const { Route } = await import('@/routes/_auth');
// The route plugin splits the component into a lazy chunk: load it before the first render.
const AuthLayout = (
  Route as unknown as { options: { component: ComponentType & { preload?: () => Promise<void> } } }
).options.component;
await AuthLayout.preload?.();

const setAuth = (next: Partial<typeof mocks.auth>) => Object.assign(mocks.auth, next);

describe('AuthLayout', () => {
  beforeEach(() => {
    mocks.pathname = '/voting/proposals/1';
    setAuth({ identity: undefined, isLoggingIn: false, isLoggingOut: false });
    Object.values(signedInHooks).forEach((hook) => hook.mockClear());
  });

  it('shows the app and its signed-in parts to a signed-in user', () => {
    setAuth({ identity: {} });
    render(<AuthLayout />);

    expect(screen.getByTestId('layout-app')).toBeTruthy();
    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.getByText('command palette')).toBeTruthy();
    Object.values(signedInHooks).forEach((hook) => expect(hook).toHaveBeenCalled());
  });

  it('shows a public page to a reader, without the signed-in parts', () => {
    render(<AuthLayout />);

    expect(screen.getByTestId('layout-reader')).toBeTruthy();
    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.queryByText('command palette')).toBeNull();
    Object.values(signedInHooks).forEach((hook) => expect(hook).not.toHaveBeenCalled());
  });

  it('shows nothing on a protected page without a session', () => {
    // Also the case of a session that ends while a proposal page is pending over this page.
    mocks.pathname = '/dashboard';
    const { container } = render(<AuthLayout />);

    expect(container.innerHTML).toBe('');
  });

  it('announces a login that waits for Internet Identity', () => {
    setAuth({ isLoggingIn: true });
    render(<AuthLayout />);

    expect(screen.getByRole('status').textContent).toBe('Waiting for Internet Identity…');
  });

  it('keeps the page in place at a login', () => {
    const { rerender } = render(<AuthLayout />);
    const page = screen.getByText('page');

    setAuth({ identity: {} });
    rerender(<AuthLayout />);

    expect(screen.getByText('page')).toBe(page);
    expect(screen.getByTestId('layout-app')).toBeTruthy();
  });

  it('shows no reader view after a logout in this tab, until the redirect', () => {
    setAuth({ identity: {} });
    const { container, rerender } = render(<AuthLayout />);

    setAuth({ identity: undefined, isLoggingOut: true });
    rerender(<AuthLayout />);
    expect(container.innerHTML).toBe('');

    // The logout ended, and the router has not left the page yet.
    setAuth({ isLoggingOut: false });
    rerender(<AuthLayout />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the reader view after a logout in another tab or an expired session', () => {
    setAuth({ identity: {} });
    const { rerender } = render(<AuthLayout />);

    setAuth({ identity: undefined });
    rerender(<AuthLayout />);

    expect(screen.getByTestId('layout-reader')).toBeTruthy();
  });
});
