/**
 * A proposal page, for example `/voting/proposals/144845`. The first group is the proposal ID, which
 * starts at 1 as in `isValidProposalId`.
 */
export const PROPOSAL_PATH = /^\/voting\/proposals\/([1-9]\d*)\/?$/;

/** Whether a visitor without a session can open the page. */
export const isPublicPath = (pathname: string): boolean => PROPOSAL_PATH.test(pathname);
