import { ProposalInfo, ProposalStatus } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { sortProposals } from './proposals';

describe('sortProposals', () => {
  const createProposal = (id: bigint, status: number): ProposalInfo =>
    ({
      id,
      status,
    }) as unknown as ProposalInfo;

  it('prioritizes OPEN proposals', () => {
    const openProposal = createProposal(1n, ProposalStatus.Open);
    const executedProposal = createProposal(2n, ProposalStatus.Executed);

    expect(sortProposals(openProposal, executedProposal)).toBe(-1);
    expect(sortProposals(executedProposal, openProposal)).toBe(1);
  });

  it('keeps original order for non-open statuses', () => {
    const executedProposal = createProposal(1n, ProposalStatus.Executed);
    const rejectedProposal = createProposal(2n, ProposalStatus.Rejected);

    expect(sortProposals(executedProposal, rejectedProposal)).toBe(0);
  });

  it('sorts a list correctly', () => {
    const proposals = [
      createProposal(1n, ProposalStatus.Executed),
      createProposal(2n, ProposalStatus.Open),
      createProposal(3n, ProposalStatus.Rejected),
      createProposal(4n, ProposalStatus.Open),
    ];

    const sorted = proposals.sort(sortProposals);

    expect(sorted[0].id).toBe(2n);
    expect(sorted[1].id).toBe(4n);
    expect(sorted[2].id).toBe(1n);
    expect(sorted[3].id).toBe(3n);
  });
});
