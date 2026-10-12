import type { PlausibleRequestPayload } from '@plausible-analytics/tracker';

const PROPOSAL_PATH = /\/voting\/proposals\/(\d+)(?=\/?(?:[?#]|$))/;

/**
 * Reports every proposal page as `/voting/proposals/:id` and moves the ID to the
 * `proposal_id` property, so Plausible shows one row for all proposal pages.
 */
export const groupProposalPages = (payload: PlausibleRequestPayload): PlausibleRequestPayload => {
  const match = PROPOSAL_PATH.exec(payload.u);
  if (!match) return payload;

  return {
    ...payload,
    u: payload.u.replace(PROPOSAL_PATH, '/voting/proposals/:id'),
    p: { ...payload.p, proposal_id: match[1] },
  };
};
