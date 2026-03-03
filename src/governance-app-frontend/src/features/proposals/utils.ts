import { ProposalInfo, ProposalStatus } from '@icp-sdk/canisters/nns';

export const getProposalTimeLeftInSeconds = (proposal: ProposalInfo): bigint => {
  const now = Date.now() / 1000;
  const deadline = Number(proposal.deadlineTimestampSeconds ?? 0n);
  return BigInt(Math.floor(Math.max(deadline - now, 0)));
};

export const getProposalStatusColor = (proposal: ProposalInfo): string => {
  const { status } = proposal;
  return status === ProposalStatus.Open
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    : status === ProposalStatus.Executed
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

export enum ProposalFilter {
  Open = 'open',
  All = 'all',
}

// Validate and parse showProposals and proposalFilter from URL search params
export const getShowProposalUrlStatus = ({
  showProposals,
  proposalFilter,
}: Record<string, unknown>): { showProposals?: boolean; proposalFilter?: ProposalFilter } => {
  return {
    showProposals: showProposals === true || showProposals === 'true' ? true : undefined,
    proposalFilter: proposalFilter === ProposalFilter.All ? ProposalFilter.All : undefined,
  };
};
