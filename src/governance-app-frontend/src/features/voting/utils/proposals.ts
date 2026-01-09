import { ProposalInfo } from '@icp-sdk/canisters/nns';

export const sortProposals = (proposalA: ProposalInfo, proposalB: ProposalInfo): number => {
  const isAOpen = proposalA.status === 1;
  const isBOpen = proposalB.status === 1;

  // If both are open, or neither are open, keep original order
  if (isAOpen === isBOpen) return 0;
  if (isAOpen) return -1;
  return 1;
};
