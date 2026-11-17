import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isLoginHandoffActive } from '@common/auth/loginHandoff';

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
  AppFrame: ({
    activeHref,
    children,
    inert,
  }: {
    activeHref: string;
    children: ReactNode;
    inert: boolean;
  }) => (
    <div data-testid="frame" data-active={activeHref} inert={inert}>
      {children}
    </div>
  ),
}));
vi.mock('@components/skeletons/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}));

const frame = () => screen.queryByTestId('frame');
const appRoot = () => document.getElementById('root') as HTMLElement;

describe('LoginHandoff', () => {
  beforeEach(() => {
    auth.identity = undefined;
    auth.isFinishingLogin = false;
    router.location = { pathname: '/', search: {} };
    router.status = 'idle';
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
  });

  afterEach(() => {
    appRoot().remove();
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
    expect(frame()?.hasAttribute('inert')).toBe(true);
    expect(screen.getByTestId('login-handoff').hasAttribute('inert')).toBe(false);
    expect(screen.getByTestId('login-handoff-status').getAttribute('role')).toBe('status');
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

  it('makes the page under the frame inert while the frame shows.', () => {
    auth.isFinishingLogin = true;
    const { rerender } = render(<LoginHandoff />);
    expect(appRoot().inert).toBe(true);
    expect(isLoginHandoffActive()).toBe(true);

    auth.isFinishingLogin = false;
    rerender(<LoginHandoff />);

    expect(appRoot().inert).toBe(false);
    expect(isLoginHandoffActive()).toBe(false);
  });

  it('gives the login page back when the login fails.', () => {
    auth.isFinishingLogin = true;
    const { rerender } = render(<LoginHandoff />);

    auth.isFinishingLogin = false;
    rerender(<LoginHandoff />);

    expect(frame()).toBeNull();
  });
});
