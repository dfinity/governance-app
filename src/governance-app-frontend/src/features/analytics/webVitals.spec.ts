import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { INPMetric, LCPMetric } from 'web-vitals';

import { getBucket, reportWebVitals, toRoutePattern, toWebVitalProps } from './webVitals';

const { onLCP, onINP, router } = vi.hoisted(() => ({
  onLCP: vi.fn(),
  onINP: vi.fn(),
  router: { getMatchedRoutes: vi.fn() },
}));

vi.mock('web-vitals', () => ({ onLCP, onINP }));
vi.mock('@utils/initializer', () => ({ routerConfig: router }));

const lcp = (value: number, overrides: Partial<LCPMetric> = {}) =>
  ({ name: 'LCP', value, rating: 'good', navigationType: 'navigate', ...overrides }) as LCPMetric;

const inp = (value: number, overrides: Partial<INPMetric> = {}) =>
  ({ name: 'INP', value, rating: 'good', navigationType: 'navigate', ...overrides }) as INPMetric;

const navigate = (path: string) => window.history.replaceState(null, '', path);

describe('getBucket', () => {
  it.each([
    ['LCP', 0, '0-1000'],
    ['LCP', 1000, '0-1000'],
    ['LCP', 1000.4, '1000-1500'],
    ['LCP', 2500, '2000-2500'],
    ['LCP', 2501, '2500-3000'],
    ['LCP', 4000, '3500-4000'],
    ['LCP', 10000, '8000-10000'],
    ['LCP', 10001, '10000+'],
    ['INP', 8, '0-50'],
    ['INP', 200, '100-200'],
    ['INP', 201, '200-300'],
    ['INP', 500, '300-500'],
    ['INP', 2001, '2000+'],
  ] as const)('puts %s %d in %s', (name, value, bucket) => {
    expect(getBucket(name, value)).toBe(bucket);
  });
});

describe('toRoutePattern', () => {
  it.each([
    ['/', '/'],
    ['/dashboard/', '/dashboard'],
    ['/voting/proposals/$id/', '/voting/proposals/:id'],
  ])('converts %s to %s', (fullPath, pattern) => {
    expect(toRoutePattern(fullPath)).toBe(pattern);
  });
});

describe('toWebVitalProps', () => {
  it('sends only the name, the bucket, the rating, and the route', () => {
    const metric = lcp(3210.7, {
      rating: 'needs-improvement',
      id: 'v5-1',
      delta: 3210.7,
      entries: [],
    });

    expect(toWebVitalProps(metric, '/')).toEqual({
      metric: 'LCP',
      bucket: '3000-3500',
      rating: 'needs-improvement',
      route: '/',
    });
  });
});

describe('reportWebVitals', () => {
  const ROUTES: Record<string, string> = {
    '/dashboard': '/dashboard/',
    '/neurons': '/neurons/',
    '/voting/proposals/7': '/voting/proposals/$id/',
  };
  const send = vi.fn();
  const reportLcp = (metric: LCPMetric) => onLCP.mock.calls[0][0](metric);
  const reportInp = (metric: INPMetric) => onINP.mock.calls[0][0](metric);

  beforeEach(() => {
    send.mockReset();
    onLCP.mockReset();
    onINP.mockReset();
    router.getMatchedRoutes.mockImplementation((pathname: string) => [
      [{ fullPath: '/' }, { fullPath: ROUTES[pathname] }],
    ]);
    navigate('/neurons');
    reportWebVitals('/dashboard', send);
  });

  it('reports the LCP on the landing route, after a navigation too', () => {
    reportLcp(lcp(1200));

    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ metric: 'LCP', route: '/dashboard' }),
    );
  });

  it('reports the INP on the current route', () => {
    navigate('/voting/proposals/7');
    reportInp(inp(120));

    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ metric: 'INP', route: '/voting/proposals/:id' }),
    );
  });

  it('skips the LCP of a page from the back/forward cache', () => {
    reportLcp(lcp(20, { navigationType: 'back-forward-cache' }));

    expect(send).not.toHaveBeenCalled();
  });
});
