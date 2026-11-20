import type { PlausibleRequestPayload } from '@plausible-analytics/tracker';

import { PROPOSAL_PATH } from '@utils/publicRoutes';

// The app pages that have no ID in the path.
const STATIC_PATHS = new Set(['/dashboard', '/neurons', '/voting', '/accounts', '/settings']);

const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/**
 * Returns the UTM parameters of a URL query string.
 */
export const getCampaignParams = (search: string): [string, string][] => {
  const params = new URLSearchParams(search);
  return CAMPAIGN_PARAMS.flatMap((key) => {
    const value = params.get(key);
    return value ? [[key, value] as [string, string]] : [];
  });
};

const getHostname = (url: string): string | undefined => {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
};

/**
 * Removes the query and the hash of the page URL, and a referrer from the same host. They can
 * hold a neuron ID or an account ID. An external referrer stays, because it sets the visit source.
 */
export const removeUrlParams = (payload: PlausibleRequestPayload): PlausibleRequestPayload => {
  const { u, r } = payload;
  return {
    ...payload,
    u: u.split(/[?#]/)[0],
    r: r && getHostname(r) === getHostname(u) ? null : r,
  };
};

/**
 * Adds the UTM parameters of the landing URL to the payload URL.
 * A redirect, for example from `/` to `/dashboard`, drops the query of the landing URL.
 */
export const addCampaignParams = (
  payload: PlausibleRequestPayload,
  campaign: [string, string][],
): PlausibleRequestPayload => {
  if (campaign.length === 0) return payload;

  let url: URL;
  try {
    url = new URL(payload.u);
  } catch {
    return payload;
  }

  for (const [key, value] of campaign) url.searchParams.set(key, value);
  return { ...payload, u: url.toString() };
};

/**
 * Reports every proposal page as `/voting/proposals/:id` and moves the ID to the
 * `proposal_id` property, so Plausible shows one row for all proposal pages.
 */
export const groupProposalPages = (payload: PlausibleRequestPayload): PlausibleRequestPayload => {
  let url: URL;
  try {
    url = new URL(payload.u);
  } catch {
    return payload;
  }

  const match = PROPOSAL_PATH.exec(url.pathname);
  if (!match) return payload;

  url.pathname = '/voting/proposals/:id';
  return {
    ...payload,
    u: url.toString(),
    p: { ...payload.p, proposal_id: match[1] },
  };
};

/**
 * Adds the `redirect_target` property to an event on the login page that has a `redirect`
 * query, so Plausible shows which page a signed-out visitor tried to open.
 * A proposal path becomes `/voting/proposals/:id`. A path that is not an app page becomes `other`.
 */
export const addRedirectTarget = (payload: PlausibleRequestPayload): PlausibleRequestPayload => {
  let url: URL;
  try {
    url = new URL(payload.u);
  } catch {
    return payload;
  }

  if (url.pathname !== '/') return payload;

  const redirect = url.searchParams.get('redirect');
  if (!redirect) return payload;

  const path = redirect.split(/[?#]/)[0].replace(/(.)\/$/, '$1');
  const target = PROPOSAL_PATH.test(path)
    ? '/voting/proposals/:id'
    : STATIC_PATHS.has(path)
      ? path
      : 'other';

  return { ...payload, p: { ...payload.p, redirect_target: target } };
};
