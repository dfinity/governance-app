import type { PlausibleRequestPayload } from '@plausible-analytics/tracker';

const PROPOSAL_PATH = /^\/voting\/proposals\/(\d+)\/?$/;

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

/**
 * Adds the UTM parameters of the landing URL to the payload URL, unless the payload URL has
 * its own. A redirect, for example from `/` to `/dashboard`, drops the query of the landing URL.
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

  if (CAMPAIGN_PARAMS.some((key) => url.searchParams.has(key))) return payload;

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
