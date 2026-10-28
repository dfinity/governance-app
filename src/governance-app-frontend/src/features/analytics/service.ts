import type { PlausibleEventOptions, PlausibleRequestPayload } from '@plausible-analytics/tracker';
import { init, track } from '@plausible-analytics/tracker';

import { PLAUSIBLE_DOMAIN_URL } from '@constants/externalServices';
import { IS_LOCAL } from '@constants/extra';

import { AnalyticsEvent } from './events';
import { addCampaignParams, getCampaignParams, groupProposalPages } from './transformRequest';

class AnalyticsService {
  private isInitialized = false;
  private properties: Record<string, string> = {};
  // Read when the module loads, before a router redirect can drop the query.
  private landingCampaign = getCampaignParams(window.location.search);
  private lastPageviewPath?: string;
  private isWaitingForVisibility = false;

  init(): void {
    // Local builds can run on a LAN address, which the tracker does not treat as localhost.
    if (this.isInitialized || !PLAUSIBLE_DOMAIN_URL || IS_LOCAL) return;

    init({
      // Required Your site's domain, as declared by you in Plausible's settings.
      domain: PLAUSIBLE_DOMAIN_URL,
      // Track outbound links clicks
      outboundLinks: true,
      // The tracker captures only `pushState`, but a router redirect uses `replaceState`.
      // `pageview()` runs after each router navigation instead.
      autoCapturePageviews: false,
      // https://plausible.io/docs/hash-based-routing
      hashBasedRouting: false,
      captureOnLocalhost: false,
      customProperties: () => this.properties,
      transformRequest: (payload) => this.transformRequest(payload),
    });

    // A page restored from the back/forward cache is a new pageview.
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      this.lastPageviewPath = undefined;
      this.pageview();
    });

    this.isInitialized = true;
    this.pageview();
  }

  /**
   * Sends a pageview, unless the last pageview has the same path.
   * A change of the query only, for example to open a modal, is not a new pageview.
   */
  pageview(): void {
    if (!this.isInitialized) return;

    // A prerendered page or a page in a background tab waits until the user sees it.
    if (document.visibilityState === 'hidden') {
      if (this.isWaitingForVisibility) return;
      this.isWaitingForVisibility = true;
      document.addEventListener(
        'visibilitychange',
        () => {
          this.isWaitingForVisibility = false;
          this.pageview();
        },
        { once: true },
      );
      return;
    }

    if (window.location.pathname === this.lastPageviewPath) return;
    this.lastPageviewPath = window.location.pathname;

    this.track('pageview');
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
    // Local builds never initialize the tracker.
    if (!this.isInitialized) return;

    this.track(event as string, { props, ...options });
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

  private track(name: string, options: PlausibleEventOptions = {}): void {
    try {
      track(name, options);
    } catch {
      // Tracking must never break the app.
    }
  }

  private transformRequest(payload: PlausibleRequestPayload): PlausibleRequestPayload {
    if (payload.n !== 'pageview') return groupProposalPages(payload);

    // The first pageview of a visit sets its source.
    const campaign = this.landingCampaign;
    this.landingCampaign = [];
    return groupProposalPages(addCampaignParams(payload, campaign));
  }
}

export const analytics = new AnalyticsService();
