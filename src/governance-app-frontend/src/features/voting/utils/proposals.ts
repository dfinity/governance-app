import { ProposalInfo, ProposalStatus } from '@icp-sdk/canisters/nns';

export const sortProposals = (proposalA: ProposalInfo, proposalB: ProposalInfo): number => {
  const isAOpen = proposalA.status === ProposalStatus.Open;
  const isBOpen = proposalB.status === ProposalStatus.Open;

  // If both are open, or neither are open, keep original order
  if (isAOpen === isBOpen) return 0;
  if (isAOpen) return -1;
  return 1;
};
