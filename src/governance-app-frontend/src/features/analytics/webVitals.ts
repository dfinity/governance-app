import { type INPMetric, type LCPMetric, onINP, onLCP } from 'web-vitals';

import { routerConfig } from '@utils/initializer';

type ReportedMetric = LCPMetric | INPMetric;

export type WebVitalProps = {
  metric: ReportedMetric['name'];
  bucket: string;
  rating: ReportedMetric['rating'];
  route: string;
};

// Upper bounds in milliseconds. The bounds include the thresholds of the `rating`.
const BUCKET_BOUNDS: Record<ReportedMetric['name'], number[]> = {
  LCP: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000, 10000],
  INP: [50, 100, 200, 300, 500, 1000, 2000],
};

/**
 * Returns the range of a value, for example `2000-2500`. An upper bound is part of its range.
 * Plausible counts events and has no percentiles, so the ranges give the distribution.
 */
export const getBucket = (name: ReportedMetric['name'], value: number): string => {
  const bounds = BUCKET_BOUNDS[name];
  const index = bounds.findIndex((bound) => value <= bound);
  if (index === -1) return `${bounds[bounds.length - 1]}+`;
  return `${bounds[index - 1] ?? 0}-${bounds[index]}`;
};

/**
 * Converts a router path to the format of the grouped pageviews, for example
 * `/voting/proposals/$id/` to `/voting/proposals/:id`. The path has no param values.
 */
export const toRoutePattern = (fullPath: string): string =>
  fullPath.replace(/\$/g, ':').replace(/(.)\/$/, '$1');

const getRoutePattern = (): string =>
  toRoutePattern(routerConfig.state.matches.at(-1)?.fullPath ?? '/');

export const toWebVitalProps = (metric: ReportedMetric, route: string): WebVitalProps => ({
  metric: metric.name,
  bucket: getBucket(metric.name, metric.value),
  rating: metric.rating,
  route,
});

/**
 * Sends the LCP and the INP of the page. The other web vitals are not sent, because each one
 * adds a Plausible event to each page load.
 */
export const reportWebVitals = (send: (props: WebVitalProps) => void): void => {
  // The LCP belongs to the first route, but the library reports it after the first interaction.
  const landingRoute = getRoutePattern();

  onLCP((metric) => {
    // The LCP of a page from the back/forward cache is not a page load.
    if (metric.navigationType === 'back-forward-cache') return;
    send(toWebVitalProps(metric, landingRoute));
  });

  // The library reports the INP when the page hides, and again if a later value is worse.
  onINP((metric) => send(toWebVitalProps(metric, getRoutePattern())));
};
