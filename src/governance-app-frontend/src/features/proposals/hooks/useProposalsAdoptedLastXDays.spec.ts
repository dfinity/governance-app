import { ProposalInfo, ProposalStatus } from '@icp-sdk/canisters/nns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { filterProposalsExecutedInLastXDays } from './useProposalsAdoptedLastXDays';

describe('filterProposalsExecutedInLastXDays', () => {
  const SECONDS_IN_A_DAY = 86400;

  const mockNow = new Date('2026-01-14:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const nowInSeconds = Math.floor(mockNow / 1000);

  const createProposal = (
    id: bigint,
    status: ProposalStatus,
    executedTimestampSeconds: bigint,
  ): ProposalInfo =>
    ({
      id,
      status,
      executedTimestampSeconds,
    }) as unknown as ProposalInfo;

  it('returns an empty array when no proposals are provided', () => {
    const result = filterProposalsExecutedInLastXDays([], 30);
    expect(result).toEqual([]);
  });

  it('returns only executed proposals', () => {
    const executedTimestamp = BigInt(nowInSeconds - SECONDS_IN_A_DAY); // 1 day ago
    const proposals = [
      createProposal(1n, ProposalStatus.Executed, executedTimestamp),
      createProposal(2n, ProposalStatus.Open, 0n),
      createProposal(3n, ProposalStatus.Rejected, 0n),
      createProposal(4n, ProposalStatus.Failed, 0n),
    ];

    const result = filterProposalsExecutedInLastXDays(proposals, 30);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1n);
  });

  it('filters out proposals executed before the time window', () => {
    const withinWindow = BigInt(nowInSeconds - 5 * SECONDS_IN_A_DAY); // 5 days ago
    const outsideWindow = BigInt(nowInSeconds - 10 * SECONDS_IN_A_DAY); // 10 days ago

    const proposals = [
      createProposal(1n, ProposalStatus.Executed, withinWindow),
      createProposal(2n, ProposalStatus.Executed, outsideWindow),
    ];

    const result = filterProposalsExecutedInLastXDays(proposals, 7);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1n);
  });

  it('includes proposals executed exactly at the cutoff boundary', () => {
    const exactlyCutoff = BigInt(nowInSeconds - 7 * SECONDS_IN_A_DAY); // exactly 7 days ago

    const proposals = [createProposal(1n, ProposalStatus.Executed, exactlyCutoff)];

    const result = filterProposalsExecutedInLastXDays(proposals, 7);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1n);
  });

  it('returns no proposals when all are outside the time window', () => {
    const proposals = [
      createProposal(1n, ProposalStatus.Executed, BigInt(nowInSeconds - 31 * SECONDS_IN_A_DAY)),
      createProposal(2n, ProposalStatus.Executed, BigInt(nowInSeconds - 60 * SECONDS_IN_A_DAY)),
    ];

    const result = filterProposalsExecutedInLastXDays(proposals, 30);

    expect(result).toHaveLength(0);
  });

  it('preserves the order of filtered proposals', () => {
    const proposals = [
      createProposal(3n, ProposalStatus.Executed, BigInt(nowInSeconds - 3 * SECONDS_IN_A_DAY)),
      createProposal(1n, ProposalStatus.Executed, BigInt(nowInSeconds - SECONDS_IN_A_DAY)),
      createProposal(2n, ProposalStatus.Executed, BigInt(nowInSeconds - 2 * SECONDS_IN_A_DAY)),
    ];

    const result = filterProposalsExecutedInLastXDays(proposals, 30);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(3n);
    expect(result[1].id).toBe(1n);
    expect(result[2].id).toBe(2n);
  });
});
