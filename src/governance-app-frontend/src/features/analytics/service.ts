import type { PlausibleEventOptions } from '@plausible-analytics/tracker';
import { init, track } from '@plausible-analytics/tracker';

import { PLAUSIBLE_DOMAIN_URL } from '@constants/externalServices';
import { IS_LOCAL } from '@constants/extra';

import { AnalyticsEvent } from './events';
import { groupProposalPages } from './transformRequest';

class AnalyticsService {
  private isInitialized = false;
  private properties: Record<string, string> = {};

  init(): void {
    // Local builds can run on a LAN address, which the tracker does not treat as localhost.
    if (this.isInitialized || !PLAUSIBLE_DOMAIN_URL || IS_LOCAL) return;

    init({
      // Required Your site's domain, as declared by you in Plausible's settings.
      domain: PLAUSIBLE_DOMAIN_URL,
      // Track outbound links clicks
      outboundLinks: true,
      // Auto-capture page views on route changes
      autoCapturePageviews: true,
      // https://plausible.io/docs/hash-based-routing
      hashBasedRouting: false,
      captureOnLocalhost: false,
      customProperties: () => this.properties,
      transformRequest: groupProposalPages,
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
      if (IS_LOCAL) console.warn('Analytics tracker not initialized');
      return;
    }

    try {
      track(event as string, { props, ...options });
    } catch (error) {
      if (IS_LOCAL) console.error('Plausible event error:', error);
    }
  }

  /**
   * Sets properties that Plausible adds to every later event, pageviews included.
   * @param properties - Properties to add or replace
   */
  setProperties(properties: Record<string, string>): void {
    this.properties = { ...this.properties, ...properties };
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}

export const analytics = new AnalyticsService();
