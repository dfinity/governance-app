import type { PlausibleEventOptions } from '@plausible-analytics/tracker';
import { init, track } from '@plausible-analytics/tracker';

import { PLAUSIBLE_DOMAIN_URL } from '@constants/externalServices';

import { AnalyticsEvent } from './events';

class AnalyticsService {
  private isInitialized = false;

  init(): void {
    if (this.isInitialized || !PLAUSIBLE_DOMAIN_URL) return;

    init({
      // Required Your site's domain, as declared by you in Plausible's settings.
      domain: PLAUSIBLE_DOMAIN_URL,
      // Track outbound links clicks
      outboundLinks: true,
      // Auto-capture page views on route changes
      autoCapturePageviews: true,
      // https://plausible.io/docs/hash-based-routing
      hashBasedRouting: false,
      // Change to true for local development and see traffic at Plausible dashboard
      captureOnLocalhost: false,
      // Object or function that returns custom properties for a given event.
      customProperties: {},
    });

    this.isInitialized = true;
  }

  /**
   * Track a custom event
   * @param name - Event name
   * @param props - Optional event properties
   * @param options - Optional tracking options (e.g., custom url, revenue)
   */
  event(
    event: AnalyticsEvent,
    props?: Record<string, string>,
    options?: Omit<PlausibleEventOptions, 'props'>,
  ): void {
    if (!this.isInitialized) {
      console.warn('Analytics tracker not initialized');
      return;
    }

    try {
      track(event as string, { props, ...options });
    } catch (error) {
      console.error('Plausible event error:', error);
    }
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}

export const analytics = new AnalyticsService();
