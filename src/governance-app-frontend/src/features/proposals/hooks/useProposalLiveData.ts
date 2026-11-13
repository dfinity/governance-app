import { ProposalInfo, Tally } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';

import { useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { nowInSeconds } from '@utils/date';
import { QUERY_KEYS } from '@utils/query';

import { getKnownNeuronVotes } from '../knownNeuronVotes';

// The page polls governance this often while the proposal takes votes and the tab is visible.
export const LIVE_POLL_INTERVAL_MS = 15_000;

export const isTakingVotes = (proposal: ProposalInfo): boolean =>
  Number(proposal.deadlineTimestampSeconds ?? 0n) > nowInSeconds();

// Yes and No only rise, so the tally with more votes is the newer one.
const isNewerTally = (tally: Tally, than: Tally | undefined) =>
  isNullish(than) || tally.yes + tally.no > than.yes + than.no;

/**
 * The proposal with its latest tally. While the proposal takes votes, a query call reads the
 * tally again at each poll, so it is not certified.
 */
export const useLiveProposal = (proposal: ProposalInfo): ProposalInfo => {
  const { ready, canister } = useNnsGovernance();
  const live = isTakingVotes(proposal);

  const { data: liveTally } = useQuery({
    queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSAL_LIVE_TALLY, proposal.id?.toString()],
    queryFn: async () => {
      const { proposals } = await canister!.listProposals({
        certified: false,
        request: {
          beforeProposal: proposal.id! + 1n,
          limit: 1,
          excludeTopic: [],
          includeRewardStatus: [],
          includeStatus: [],
          includeAllManageNeuronProposals: false,
          omitLargeFields: true,
        },
      });
      const match = proposals.find(({ id }) => id === proposal.id);
      return match?.latestTally ?? null;
    },
    enabled: ready && live && !isNullish(proposal.id),
    refetchInterval: live ? LIVE_POLL_INTERVAL_MS : false,
  });

  return liveTally && isNewerTally(liveTally, proposal.latestTally)
    ? { ...proposal, latestTally: liveTally }
    : proposal;
};

/**
 * The vote of each active known neuron, read from their recent ballots. A query call, so it is
 * not certified. It polls while the proposal takes votes.
 */
export const useKnownNeuronVotes = (proposal: ProposalInfo) => {
  const { ready, canister } = useNnsGovernance();
  const knownNeurons = useGovernanceKnownNeurons().data?.response;
  const live = isTakingVotes(proposal);
  const neuronIds = knownNeurons?.map(({ id }) => id);

  const query = useQuery({
    queryKey: [
      QUERY_KEYS.NNS_GOVERNANCE.KNOWN_NEURON_BALLOTS,
      neuronIds?.map(String),
      proposal.id?.toString(),
    ],
    queryFn: () =>
      canister!.listNeurons({
        certified: false,
        neuronIds,
        includeEmptyNeurons: true,
        includePublicNeurons: true,
      }),
    enabled: ready && !isNullish(neuronIds) && neuronIds.length > 0 && !isNullish(proposal.id),
    staleTime: live ? LIVE_POLL_INTERVAL_MS : Infinity,
    refetchInterval: live ? LIVE_POLL_INTERVAL_MS : false,
  });

  const votes =
    knownNeurons && query.data && !isNullish(proposal.id)
      ? getKnownNeuronVotes({ knownNeurons, neurons: query.data, proposalId: proposal.id })
      : undefined;

  return { votes, isError: query.isError, dataUpdatedAt: query.dataUpdatedAt };
};
