import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginHandoff } from './LoginHandoff';

const auth = vi.hoisted(() => ({
  identity: undefined as object | undefined,
  isFinishingLogin: false,
}));
const router = vi.hoisted(() => ({
  location: { pathname: '/', search: {} as { redirect?: unknown } },
  status: 'idle',
}));

vi.mock('@hooks/useInternetIdentity', () => ({ useInternetIdentity: () => auth }));
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (state: typeof router) => unknown }) => select(router),
}));
vi.mock('@components/MainLayout', () => ({
  AppFrame: ({ activeHref, children }: { activeHref: string; children: ReactNode }) => (
    <div data-testid="frame" data-active={activeHref}>
      {children}
    </div>
  ),
}));
vi.mock('@components/skeletons/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}));

const frame = () => screen.queryByTestId('frame');

describe('LoginHandoff', () => {
  beforeEach(() => {
    auth.identity = undefined;
    auth.isFinishingLogin = false;
    router.location = { pathname: '/', search: {} };
    router.status = 'idle';
  });

  it('renders nothing before Internet Identity answers.', () => {
    render(<LoginHandoff />);

    expect(frame()).toBeNull();
  });

  it('renders nothing for a session that it did not see start.', () => {
    auth.identity = {};
    render(<LoginHandoff />);

    expect(frame()).toBeNull();
  });

  it('shows the dashboard frame once Internet Identity answers.', () => {
    auth.isFinishingLogin = true;
    render(<LoginHandoff />);

    expect(frame()?.getAttribute('data-active')).toBe('/dashboard');
    expect(screen.getByTestId('login-handoff').hasAttribute('inert')).toBe(true);
    expect(screen.queryByTestId('dashboard-skeleton')).not.toBeNull();
  });

  it('shows an empty frame for a login that returns to another route.', () => {
    auth.isFinishingLogin = true;
    router.location.search = { redirect: '/voting/proposals/1' };
    render(<LoginHandoff />);

    expect(frame()?.getAttribute('data-active')).toBe('/voting/proposals/1');
    expect(screen.queryByTestId('dashboard-skeleton')).toBeNull();
  });

  it('ignores a redirect that the login route rejects.', () => {
    auth.isFinishingLogin = true;
    router.location.search = { redirect: 42 };
    render(<LoginHandoff />);

    expect(frame()?.getAttribute('data-active')).toBe('/dashboard');
  });

  it('stays away from a route that is ready during the login.', () => {
    auth.isFinishingLogin = true;
    router.location = { pathname: '/settings', search: {} };
    render(<LoginHandoff />);

    expect(frame()).toBeNull();
  });

  it('leaves when a route becomes ready during the login.', () => {
    auth.isFinishingLogin = true;
    const { rerender } = render(<LoginHandoff />);
    expect(frame()).not.toBeNull();

    router.location = { pathname: '/settings', search: {} };
    rerender(<LoginHandoff />);

    expect(frame()).toBeNull();
  });

  it('stays until the first route is ready.', () => {
    auth.isFinishingLogin = true;
    const { rerender } = render(<LoginHandoff />);

    auth.isFinishingLogin = false;
    auth.identity = {};
    rerender(<LoginHandoff />);
    expect(frame()).not.toBeNull();

    router.location = { pathname: '/dashboard', search: {} };
    router.status = 'pending';
    rerender(<LoginHandoff />);
    expect(frame()).not.toBeNull();

    router.status = 'idle';
    rerender(<LoginHandoff />);
    expect(frame()).toBeNull();
  });

  it('gives the login page back when the login fails.', () => {
    auth.isFinishingLogin = true;
    const { rerender } = render(<LoginHandoff />);

    auth.isFinishingLogin = false;
    rerender(<LoginHandoff />);

    expect(frame()).toBeNull();
  });
});
