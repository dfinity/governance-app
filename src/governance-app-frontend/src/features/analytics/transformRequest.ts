import type { PlausibleRequestPayload } from '@plausible-analytics/tracker';

const PROPOSAL_PATH = /^\/voting\/proposals\/(\d+)\/?$/;

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
