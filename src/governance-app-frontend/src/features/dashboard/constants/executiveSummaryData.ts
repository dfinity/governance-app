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

const AUGUST_2026: MonthlyGovernanceSummary = {
  month: 'August',
  year: 2026,

  outcomes: [
    { status: 'approved', count: 478 },
    { status: 'rejected', count: 3 },
    { status: 'failed', count: 3 },
  ],

  topChanges: [
    {
      icon: 'network',
      title: 'Network operations & infrastructure',
      description: 'Swiss subnet SEV migration completed (waves 2 to 8); 8 retired subnets deleted',
      highlights: [
        { value: 393, label: 'rollouts completed' },
        { value: 6, label: 'GuestOS versions' },
        { value: 3, label: 'HostOS versions' },
        { value: 8, label: 'subnets retired' },
      ],
    },
    {
      icon: 'protocol',
      title: 'Core protocol & app upgrades',
      description: 'ckBAT joined the ckERC20 suite; Internet Identity shipped app metadata support',
      highlights: [
        { value: 14, label: 'protocol upgrades' },
        { value: 9, label: 'II upgrades' },
        { value: 2, label: 'NNS Dapp upgrades' },
        { value: 1, label: 'ckERC20 token added' },
      ],
    },
    {
      icon: 'community',
      title: 'Community governance',
      description: 'DOXA motion passed; DoxaUSD SNS launched; NOKU SA node provider removed',
      highlights: [
        { value: 1, label: 'motion passed' },
        { value: 1, label: 'SNS launched' },
        { value: 3, label: 'releases rejected' },
        { value: 1, label: 'node provider removed' },
      ],
    },
  ],

  communityHighlights: [
    {
      title: 'Motion: Urgent Protective Action for the DOXA SNS Swap',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: "Create a SNS Named 'DoxaUSD (DUSD)'",
      outcome: 'passed',
      label: 'Launch Approved',
    },
    {
      title: 'Add ckBAT to the ckERC20 Ledger Suite',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Remove NOKU SA as a Node Provider',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Elect IC/GuestOS Revision (fffab35)',
      outcome: 'rejected',
      label: 'Rejected',
    },
    {
      title: 'Elect IC/HostOS Revision (fffab35)',
      outcome: 'rejected',
      label: 'Rejected',
    },
  ],
};

/** The currently displayed summary — update this reference each month */
export const currentSummary: MonthlyGovernanceSummary = AUGUST_2026;
