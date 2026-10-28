import type { PlausibleConfig, PlausibleRequestPayload } from '@plausible-analytics/tracker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from './events';

const { init, track, env } = vi.hoisted(() => ({
  init: vi.fn(),
  track: vi.fn(),
  env: { isLocal: false },
}));

vi.mock('@plausible-analytics/tracker', () => ({ init, track }));
vi.mock('@constants/externalServices', () => ({
  PLAUSIBLE_DOMAIN_URL: 'nns.internetcomputer.org',
}));
vi.mock('@constants/extra', () => ({
  get IS_LOCAL() {
    return env.isLocal;
  },
}));

// The vitest config replaces `@features/analytics/service` with a stub, so import the real file.
// A new module gives a new service, which reads the landing URL again.
const loadService = async () => {
  vi.resetModules();
  return (await import('./service')).analytics;
};

const navigate = (url: string) => window.history.replaceState(null, '', url);

const pageviews = () => track.mock.calls.filter(([name]) => name === 'pageview').length;

const transformRequest = (payload: PlausibleRequestPayload) => {
  const config = init.mock.calls[0][0] as PlausibleConfig;
  return config.transformRequest!(payload);
};

const payload = (n: string, u: string): PlausibleRequestPayload => ({
  n,
  u,
  d: 'nns.internetcomputer.org',
});

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });

describe('analytics service', () => {
  beforeEach(() => {
    init.mockReset();
    track.mockReset();
    env.isLocal = false;
    setVisibility('visible');
    navigate('/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the tracker once and sends one pageview', async () => {
    const analytics = await loadService();

    analytics.init();
    analytics.init();

    expect(init).toHaveBeenCalledOnce();
    expect(init.mock.calls[0][0]).toMatchObject({ autoCapturePageviews: false });
    expect(track).toHaveBeenCalledExactlyOnceWith('pageview', {});
  });

  it('does not start the tracker in a local build', async () => {
    env.isLocal = true;
    const analytics = await loadService();

    analytics.init();
    analytics.pageview();
    analytics.event(AnalyticsEvent.SessionLogout);

    expect(init).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it('sends one pageview for the target of a redirect', async () => {
    navigate('/accounts');
    const analytics = await loadService();
    analytics.init();

    // The router redirects from `/accounts` to `/dashboard` with `replaceState`.
    navigate('/dashboard');
    analytics.pageview();
    // A second start of the tracker, and a modal that changes the query only.
    analytics.init();
    navigate('/dashboard?depositModal=true');
    analytics.pageview();

    expect(pageviews()).toBe(2);
  });

  it('sends a pageview for each new path', async () => {
    const analytics = await loadService();
    analytics.init();

    navigate('/voting');
    analytics.pageview();
    navigate('/dashboard');
    analytics.pageview();

    expect(pageviews()).toBe(3);
  });

  it('does not send a pageview before the tracker starts', async () => {
    const analytics = await loadService();

    analytics.pageview();

    expect(track).not.toHaveBeenCalled();
  });

  it('waits until a hidden page is visible', async () => {
    setVisibility('hidden');
    const analytics = await loadService();
    analytics.init();

    expect(track).not.toHaveBeenCalled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(track).toHaveBeenCalledExactlyOnceWith('pageview', {});
  });

  it('sends a pageview when the page comes back from the back/forward cache', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const analytics = await loadService();
    analytics.init();

    const onPageShow = addEventListener.mock.calls.find(([type]) => type === 'pageshow')?.[1];
    (onPageShow as EventListener)({ persisted: true } as PageTransitionEvent);

    expect(pageviews()).toBe(2);
  });

  it('sends a custom event with its properties', async () => {
    const analytics = await loadService();
    analytics.init();

    analytics.event(AnalyticsEvent.SessionLogout, { source: 'user_menu' });

    expect(track).toHaveBeenLastCalledWith('session_logout', { props: { source: 'user_menu' } });
  });

  it('does not throw if the tracker throws', async () => {
    track.mockImplementation(() => {
      throw new Error('blocked');
    });
    const analytics = await loadService();

    expect(() => analytics.init()).not.toThrow();
    expect(() => analytics.event(AnalyticsEvent.SessionLogout)).not.toThrow();
  });

  describe('transformRequest', () => {
    it('adds the landing UTM parameters to the first pageview only', async () => {
      navigate('/?utm_source=nns-dapp&utm_medium=modal&utm_content=banner');
      const analytics = await loadService();
      // A signed-in user goes from `/` to `/dashboard` before the tracker starts.
      navigate('/dashboard');
      analytics.init();

      expect(
        transformRequest(payload('session_logout', 'https://nns.internetcomputer.org/dashboard'))
          ?.u,
      ).toBe('https://nns.internetcomputer.org/dashboard');
      expect(
        transformRequest(payload('pageview', 'https://nns.internetcomputer.org/dashboard'))?.u,
      ).toBe(
        'https://nns.internetcomputer.org/dashboard?utm_source=nns-dapp&utm_medium=modal&utm_content=banner',
      );
      expect(
        transformRequest(payload('pageview', 'https://nns.internetcomputer.org/voting'))?.u,
      ).toBe('https://nns.internetcomputer.org/voting');
    });

    it('groups the proposal pages', async () => {
      const analytics = await loadService();
      analytics.init();

      expect(
        transformRequest(payload('pageview', 'https://nns.internetcomputer.org/voting/proposals/7'))
          ?.u,
      ).toBe('https://nns.internetcomputer.org/voting/proposals/:id');
    });
  });
});
