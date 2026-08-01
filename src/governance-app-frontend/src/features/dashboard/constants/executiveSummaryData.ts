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

const JULY_2026: MonthlyGovernanceSummary = {
  month: 'July',
  year: 2026,

  outcomes: [
    { status: 'approved', count: 612 },
    { status: 'rejected', count: 6 },
    { status: 'failed', count: 1 },
  ],

  topChanges: [
    {
      icon: 'network',
      title: 'Network operations & infrastructure',
      description: 'Confidential computing migration started; Swiss subnet rebuilt with SEV-SNP',
      highlights: [
        { value: 533, label: 'rollouts completed' },
        { value: 7, label: 'GuestOS versions' },
        { value: 3, label: 'HostOS versions' },
        { value: 4, label: 'nodes replaced' },
      ],
    },
    {
      icon: 'protocol',
      title: 'Core protocol & app upgrades',
      description: 'Internet Identity shipped MCP support, SSO gating, and session length choice',
      highlights: [
        { value: 16, label: 'protocol upgrades' },
        { value: 9, label: 'II upgrades' },
        { value: 2, label: 'other app upgrades' },
        { value: 1, label: 'canister reinstalled' },
      ],
    },
    {
      icon: 'community',
      title: 'Community governance',
      description: 'Target topology revised; ICP/XDR reward floor set; three releases voted down',
      highlights: [
        { value: 2, label: 'motions passed' },
        { value: 3, label: 'releases rejected' },
        { value: 1, label: 'node provider removed' },
        { value: 1, label: 'subnet recovered' },
      ],
    },
  ],

  communityHighlights: [
    {
      title: 'Motion: Revised Target Topology',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Motion: Node Provider Standards Follow-Up',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Set Minimum ICP/XDR Rate Floor to 2 XDR',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Create Second SEV-Enabled (TEE) Subnet',
      outcome: 'passed',
      label: 'Passed',
    },
    {
      title: 'Elect IC/GuestOS Revision (1153c70)',
      outcome: 'rejected',
      label: 'Rejected',
    },
    {
      title: 'Upgrade Cycles-Minting Canister (d0bbf76)',
      outcome: 'rejected',
      label: 'Rejected',
    },
  ],
};

/** The currently displayed summary — update this reference each month */
export const currentSummary: MonthlyGovernanceSummary = JULY_2026;
