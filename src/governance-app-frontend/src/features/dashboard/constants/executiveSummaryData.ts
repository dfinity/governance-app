import type { MonthlyGovernanceSummary } from '../types/executiveSummary';

/**
 * ============================================================================
 * MONTHLY GOVERNANCE EXECUTIVE SUMMARY — Static Data
 * ============================================================================
 *
 * This file contains the hardcoded data shown in the Executive Summary card
 * on the Dashboard. It must be updated manually each month.
 *
 * HOW TO UPDATE:
 *   1. Gather the raw governance data for the month (proposal counts, key
 *      changes, notable community votes, etc.)
 *   2. Give the raw data to an LLM together with the prompt below.
 *   3. Paste the LLM's output as a new const (e.g., APRIL_2026).
 *   4. Update the `currentSummary` export at the bottom of this file.
 *   5. Remove the previous month's constant (only keep the current one).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LLM PROMPT — copy everything between the ▼ markers and paste it into your
 * LLM along with the raw governance data for the month.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ▼▼▼ START PROMPT ▼▼▼
 *
 * Generate a TypeScript object of type `MonthlyGovernanceSummary` from the
 * governance data I'll provide. Follow this schema exactly:
 *
 * ```ts
 * {
 *   month: string,        // Full month name, e.g. "February"
 *   year: number,         // e.g. 2026
 *
 *   // How many proposals were approved, rejected, and failed this month.
 *   outcomes: [
 *     { status: 'approved', count: <number> },
 *     { status: 'rejected', count: <number> },
 *     { status: 'failed',   count: <number> },
 *   ],
 *
 *   // Exactly 3 grouped categories summarising the month's key changes.
 *   // Each must use one of the allowed icons: 'network', 'protocol', 'community'.
 *   topChanges: [
 *     {
 *       icon: 'network',                // For infrastructure, rollouts, node ops
 *       title: string,                  // Short category name (≤ 50 chars)
 *       description: string,            // One-line summary of what happened (≤ 80 chars)
 *       highlights: [                   // 2–4 key numeric stats
 *         { value: <number>, label: string },
 *       ],
 *     },
 *     {
 *       icon: 'protocol',               // For core protocol / canister upgrades
 *       title: string,
 *       description: string,
 *       highlights: [ ... ],
 *     },
 *     {
 *       icon: 'community',              // For motions, SNS, DAO-related proposals
 *       title: string,
 *       description: string,
 *       highlights: [ ... ],
 *     },
 *   ],
 *
 *   // 3–6 notable community votes with their outcomes.
 *   // outcome must be 'passed' or 'rejected'.
 *   // label is a short human-readable status (e.g. "Passed", "Rejected", "Launch Approved").
 *   communityHighlights: [
 *     { title: string, outcome: 'passed' | 'rejected', label: string },
 *   ],
 * }
 * ```
 *
 * Rules:
 * - topChanges must have exactly 3 items, one per icon.
 * - Keep titles and descriptions concise.
 * - highlights.value must be a number, highlights.label a short text.
 * - communityHighlights should list the most notable votes (3–6 items).
 * - Output only the raw TypeScript object, no wrapper code.
 *
 * ▲▲▲ END PROMPT ▲▲▲
 */

const APRIL_2026: MonthlyGovernanceSummary = {
  month: 'April',
  year: 2026,

  outcomes: [
    { status: 'approved', count: 467 },
    { status: 'rejected', count: 23 },
    { status: 'failed', count: 0 },
  ],

  topChanges: [
    {
      icon: 'network',
      title: 'Network operations & infrastructure',
      description: 'Routine subnet rollouts and first cloud engine lifecycle test',
      highlights: [
        { value: 385, label: 'rollouts completed' },
        { value: 5, label: 'GuestOS versions' },
        { value: 4, label: 'HostOS versions' },
        { value: 9, label: 'subnets resized' },
      ],
    },
    {
      icon: 'protocol',
      title: 'Core protocol & app upgrades',
      description: 'Governance canister upgraded 5× alongside Internet Identity and NNS Dapp',
      highlights: [
        { value: 12, label: 'protocol upgrades' },
        { value: 10, label: 'app upgrades' },
      ],
    },
    {
      icon: 'community',
      title: 'Community governance',
      description: 'Three known neurons deregistered; 19 spam proposals rejected',
      highlights: [
        { value: 6, label: 'motions passed' },
        { value: 19, label: 'spam rejected' },
        { value: 1, label: 'node rewards updated' },
      ],
    },
  ],

  communityHighlights: [
    {
      title: 'Deregister Known Neuron: CODEGOV',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Deregister Known Neuron: WENZEL',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Register Known Neuron: HashEra',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Update the Node Rewards Table (Gen-1 type1.1 −40%)',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Motion: Explore Separation of SNS from NNS Surface',
      outcome: 'rejected',
      label: 'Rejected',
    },
    {
      title: 'Motion: Daily Node Performance Audits & Topology Exemptions',
      outcome: 'rejected',
      label: 'Rejected',
    },
  ],
};

/** The currently displayed summary — update this reference each month */
export const currentSummary: MonthlyGovernanceSummary = APRIL_2026;
