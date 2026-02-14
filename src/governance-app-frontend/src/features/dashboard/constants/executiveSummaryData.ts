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
 *   3. Paste the LLM's output as a new const (e.g., FEBRUARY_2026).
 *   4. Update the `currentSummary` export at the bottom of this file.
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

const JANUARY_2026: MonthlyGovernanceSummary = {
  month: 'January',
  year: 2026,

  outcomes: [
    { status: 'approved', count: 260 },
    { status: 'rejected', count: 7 },
    { status: 'failed', count: 1 },
  ],

  topChanges: [
    {
      icon: 'network',
      title: 'Network operations & enforcement',
      description: '550 nodes updated across 196 rollouts',
      highlights: [
        { value: 11, label: 'nodes replaced' },
        { value: 1, label: 'provider removed' },
      ],
    },
    {
      icon: 'protocol',
      title: 'Core protocol upgrades',
      description: 'Core governance and network changes applied',
      highlights: [
        { value: 4, label: 'GuestOS' },
        { value: 3, label: 'HostOS' },
      ],
    },
    {
      icon: 'community',
      title: 'Community governance (motions & SNS)',
      description: 'Community and DAO proposals',
      highlights: [
        { value: 3, label: 'Motions passed' },
        { value: 3, label: 'Rejected' },
      ],
    },
  ],

  communityHighlights: [
    { title: 'Signal Support for Cloak DAO launch', outcome: 'passed', label: 'Passed' },
    { title: '#mission70 Community Vote', outcome: 'passed', label: 'Passed' },
    { title: 'EU/EEA Subnet rebranding', outcome: 'passed', label: 'Passed' },
    { title: 'Two anti-#Mission70 motions', outcome: 'rejected', label: 'Rejected' },
    { title: 'Creation of a G20 Subnet', outcome: 'rejected', label: 'Rejected' },
  ],
};

/** The currently displayed summary — update this reference each month */
export const currentSummary: MonthlyGovernanceSummary = JANUARY_2026;
