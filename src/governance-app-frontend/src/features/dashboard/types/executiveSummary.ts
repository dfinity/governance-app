/**
 * Monthly Governance Executive Summary — Data Model
 *
 * This type defines the structure for monthly governance reports.
 * Update the corresponding data file each month with new values.
 *
 * Designed to be easily filled by an LLM from raw governance data.
 */

/** Possible proposal outcome statuses */
export type OutcomeStatus = 'approved' | 'rejected' | 'failed';

/** A single outcome count (e.g., "260 approved") */
export type ProposalOutcome = {
  status: OutcomeStatus;
  count: number;
};

/** Icon identifier for top-change categories */
export type TopChangeIcon = 'network' | 'protocol' | 'community';

/** A numeric highlight tag shown below a top change (e.g., "11 nodes replaced") */
export type TopChangeHighlight = {
  value: number;
  label: string;
};

/** A grouped top-level change category (e.g., "Network operations & enforcement") */
export type TopChange = {
  icon: TopChangeIcon;
  title: string;
  description: string;
  highlights: TopChangeHighlight[];
};

/** Outcome for a community vote */
export type CommunityVoteOutcome = 'passed' | 'rejected';

/** A notable community vote with its result */
export type CommunityVoteHighlight = {
  title: string;
  outcome: CommunityVoteOutcome;
  label: string; // Display text for the outcome (e.g., "Launch Approved", "Passed", "Rejected")
};

/** Complete monthly governance summary */
export type MonthlyGovernanceSummary = {
  month: string; // Full month name, e.g., "January"
  year: number; // e.g., 2026
  outcomes: ProposalOutcome[];
  topChanges: TopChange[];
  communityHighlights: CommunityVoteHighlight[];
};
