import { ProposalInfo, ProposalStatus } from '@icp-sdk/canisters/nns';
import { useMemo } from 'react';

import { useGovernanceProposals } from '@hooks/governance';

const SECONDS_IN_A_DAY = 86400n;

/**
 * Filters proposals that have been executed within the last X days.
 * @param proposals - Array of ProposalInfo to filter
 * @param days - Number of days to look back
 * @returns Array of proposals executed within the specified time window
 */
export const filterProposalsExecutedInLastXDays = (
  proposals: ProposalInfo[],
  days: number,
): ProposalInfo[] => {
  const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
  const cutoffTimestamp = nowInSeconds - BigInt(days) * SECONDS_IN_A_DAY;

  return proposals.filter((proposal) => {
    const isExecuted = proposal.status === ProposalStatus.Executed;
    const executedTimestamp = proposal.executedTimestampSeconds;

    // executedTimestampSeconds is 0n if not executed
    return isExecuted && executedTimestamp > 0n && executedTimestamp >= cutoffTimestamp;
  });
};

/**
 * Hook to fetch proposals that have been executed (adopted) in the last X days.
 * @param days - Number of days to look back for executed proposals
 * @returns Query result with filtered proposals in the `proposals` field
 */
export const useProposalsAdoptedLastXDays = (days: number) => {
  const proposalsQuery = useGovernanceProposals({
    beforeProposal: undefined,
    limit: 100,
    excludeTopic: [],
    includeRewardStatus: [],
    includeStatus: [ProposalStatus.Executed],
    includeAllManageNeuronProposals: false,
    omitLargeFields: true,
  });

  const proposals = useMemo(() => {
    const allProposals =
      proposalsQuery.data?.pages?.flatMap((page) => page.response.proposals) ?? [];

    return filterProposalsExecutedInLastXDays(allProposals, days);
  }, [proposalsQuery.data?.pages, days]);

  return {
    ...proposalsQuery,
    proposals,
  };
};
