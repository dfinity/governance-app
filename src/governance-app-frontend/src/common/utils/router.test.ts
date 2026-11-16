import type { Identity } from '@icp-sdk/core/agent';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type ParsedLocation,
} from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isSafeInternalRedirect, preloadSessionRouteChunks, requireIdentity } from './router';

const { session, warningNotification } = vi.hoisted(() => ({
  session: {
    identity: undefined as Identity | undefined,
    logoutRedirectPending: false,
    logoutInThisTab: false,
    stored: false,
  },
  warningNotification: vi.fn(),
}));

vi.mock('@common/auth/internetIdentity', () => ({
  ensureInitialized: async () => session.identity,
  hasStoredSession: () => session.stored,
  consumeLogout: () => {
    const pending = session.logoutRedirectPending;
    const inThisTab = session.logoutInThisTab;
    session.logoutRedirectPending = false;
    session.logoutInThisTab = false;
    if (!pending) return undefined;
    return inThisTab ? 'this-tab' : 'other-tab';
  },
}));

vi.mock('./notification', () => ({ warningNotification }));

const guard = (pathname: string) =>
  requireIdentity({ location: { pathname } as ParsedLocation }).catch(
    (redirect: Response & { options: { to: string; search?: unknown } }) => redirect.options,
  );

describe('isSafeInternalRedirect', () => {
  it('accepts same-origin absolute internal paths', () => {
    expect(isSafeInternalRedirect('/dashboard')).toBe(true);
    expect(isSafeInternalRedirect('/neurons/123')).toBe(true);
    expect(isSafeInternalRedirect('/dashboard?tab=staking#top')).toBe(true);
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(isSafeInternalRedirect('https://attacker.example')).toBe(false);
    expect(isSafeInternalRedirect('http://attacker.example')).toBe(false);
    expect(isSafeInternalRedirect('//attacker.example')).toBe(false);
  });

  it('rejects backslash bypass variants', () => {
    expect(isSafeInternalRedirect('/\\attacker.example')).toBe(false);
    expect(isSafeInternalRedirect('\\/attacker.example')).toBe(false);
  });

  it('rejects relative paths and non-string values', () => {
    expect(isSafeInternalRedirect('dashboard')).toBe(false);
    expect(isSafeInternalRedirect('')).toBe(false);
    expect(isSafeInternalRedirect(undefined)).toBe(false);
    expect(isSafeInternalRedirect(null)).toBe(false);
    expect(isSafeInternalRedirect(42)).toBe(false);
  });
});

describe('requireIdentity', () => {
  beforeEach(() => {
    session.identity = undefined;
    session.logoutRedirectPending = false;
    session.logoutInThisTab = false;
    warningNotification.mockClear();
  });

  it('sends a visitor without a session to the login page with the route and a notice.', async () => {
    await expect(guard('/dashboard')).resolves.toEqual(
      expect.objectContaining({ to: '/', search: { redirect: '/dashboard' } }),
    );
    expect(warningNotification).toHaveBeenCalledTimes(1);
  });

  it('sends the user to the login page without a notice on a logout.', async () => {
    session.logoutRedirectPending = true;

    const redirect = await guard('/dashboard');

    expect(redirect).toEqual(expect.objectContaining({ to: '/' }));
    expect(redirect).not.toHaveProperty('search.redirect');
    expect(warningNotification).not.toHaveBeenCalled();
  });

  it('keeps the route and the notice for navigation after the logout.', async () => {
    session.logoutRedirectPending = true;
    await guard('/dashboard');

    // For example, browser Back to a protected page.
    await expect(guard('/neurons')).resolves.toEqual(
      expect.objectContaining({ to: '/', search: { redirect: '/neurons' } }),
    );
    expect(warningNotification).toHaveBeenCalledTimes(1);
  });

  describe('on a public page', () => {
    it('lets a visitor without a session in, with no notice.', async () => {
      await expect(guard('/voting/proposals/144845')).resolves.toBeUndefined();
      await expect(guard('/voting/proposals/144845/')).resolves.toBeUndefined();
      expect(warningNotification).not.toHaveBeenCalled();
    });

    it('sends the user to the login page after a logout in this tab.', async () => {
      session.logoutRedirectPending = true;
      session.logoutInThisTab = true;

      const redirect = await guard('/voting/proposals/144845');

      expect(redirect).toEqual(expect.objectContaining({ to: '/' }));
      expect(redirect).not.toHaveProperty('search.redirect');
      expect(warningNotification).not.toHaveBeenCalled();
    });

    it('keeps the page after a logout in another tab, and consumes it.', async () => {
      session.logoutRedirectPending = true;

      await expect(guard('/voting/proposals/144845')).resolves.toBeUndefined();
      expect(session.logoutRedirectPending).toBe(false);
    });

    it('keeps the guard for paths that only look like a proposal page.', async () => {
      for (const path of [
        '/voting',
        '/voting/proposals/abc',
        '/voting/proposals/0',
        '/voting/proposals/1/votes',
      ]) {
        await expect(guard(path)).resolves.toEqual(
          expect.objectContaining({ to: '/', search: { redirect: path } }),
        );
      }
    });
  });
});

describe('preloadSessionRouteChunks', () => {
  const chunk = () => vi.fn(async () => ({ default: () => null }));

  const setup = (path: string) => {
    const chunks = {
      login: chunk(),
      auth: chunk(),
      dashboard: chunk(),
      neurons: chunk(),
      proposal: chunk(),
    };
    const beforeLoad = vi.fn();
    const loader = vi.fn();

    const rootRoute = createRootRoute();
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: lazyRouteComponent(chunks.login),
    });
    const authRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: '_auth',
      beforeLoad,
      component: lazyRouteComponent(chunks.auth),
    });
    const dashboardRoute = createRoute({
      getParentRoute: () => authRoute,
      path: 'dashboard',
      loader,
      component: lazyRouteComponent(chunks.dashboard),
    });
    const neuronsRoute = createRoute({
      getParentRoute: () => authRoute,
      path: 'neurons',
      loader,
      component: lazyRouteComponent(chunks.neurons),
    });

    const proposalRoute = createRoute({
      getParentRoute: () => authRoute,
      path: 'voting/proposals/$id',
      loader,
      component: lazyRouteComponent(chunks.proposal),
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([
        loginRoute,
        authRoute.addChildren([dashboardRoute, neuronsRoute, proposalRoute]),
      ]),
      history: createMemoryHistory({ initialEntries: [path] }),
    });

    return { router, chunks, beforeLoad, loader };
  };

  beforeEach(() => {
    session.stored = true;
  });

  it('starts the chunks of the route and its parents, and nothing else.', () => {
    const { router, chunks } = setup('/neurons');

    preloadSessionRouteChunks(router);

    expect(chunks.auth).toHaveBeenCalledTimes(1);
    expect(chunks.neurons).toHaveBeenCalledTimes(1);
    expect(chunks.dashboard).not.toHaveBeenCalled();
    expect(chunks.login).not.toHaveBeenCalled();
  });

  it('starts the dashboard chunks on the login page, which redirects there.', () => {
    const { router, chunks } = setup('/');

    preloadSessionRouteChunks(router);

    expect(chunks.auth).toHaveBeenCalledTimes(1);
    expect(chunks.dashboard).toHaveBeenCalledTimes(1);
    expect(chunks.login).not.toHaveBeenCalled();
  });

  it('starts the chunks of the redirect target on the login page.', () => {
    const { router, chunks } = setup('/?redirect=%2Fneurons%3Ftab%3Dstaked');

    preloadSessionRouteChunks(router);

    expect(chunks.auth).toHaveBeenCalledTimes(1);
    expect(chunks.neurons).toHaveBeenCalledTimes(1);
    expect(chunks.dashboard).not.toHaveBeenCalled();
  });

  it('starts the dashboard chunks for an unsafe redirect target.', () => {
    const { router, chunks } = setup('/?redirect=%2F%2Fattacker.example');

    preloadSessionRouteChunks(router);

    expect(chunks.dashboard).toHaveBeenCalledTimes(1);
    expect(chunks.neurons).not.toHaveBeenCalled();
  });

  it('starts the chunks of a public page for a visitor without a stored session.', () => {
    session.stored = false;
    const { router, chunks, beforeLoad, loader } = setup('/voting/proposals/144845');

    preloadSessionRouteChunks(router);

    expect(chunks.auth).toHaveBeenCalledTimes(1);
    expect(chunks.proposal).toHaveBeenCalledTimes(1);
    expect(beforeLoad).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  });

  it('starts nothing for a visitor without a stored session.', () => {
    session.stored = false;
    const { router, chunks } = setup('/dashboard');

    preloadSessionRouteChunks(router);

    Object.values(chunks).forEach((load) => expect(load).not.toHaveBeenCalled());
  });

  it('runs no route guard and no loader.', async () => {
    const { router, chunks, beforeLoad, loader } = setup('/dashboard');

    preloadSessionRouteChunks(router);
    await vi.waitFor(() => expect(chunks.dashboard).toHaveBeenCalled());

    expect(beforeLoad).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  });

  it('ignores a path that matches no route.', () => {
    const { router, chunks } = setup('/unknown');

    expect(() => preloadSessionRouteChunks(router)).not.toThrow();

    Object.values(chunks).forEach((load) => expect(load).not.toHaveBeenCalled());
  });

  it('loads a failed chunk again on the real navigation.', async () => {
    const { router, chunks } = setup('/dashboard');
    chunks.dashboard.mockRejectedValueOnce(new Error('network'));

    preloadSessionRouteChunks(router);
    await vi.waitFor(() => expect(chunks.dashboard).toHaveBeenCalledTimes(1));
    await router.load();

    expect(chunks.dashboard).toHaveBeenCalledTimes(2);
    expect(router.state.matches.at(-1)?.status).toBe('success');
  });
});
