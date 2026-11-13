import { ProposalInfo, Tally } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { MILLISECONDS_IN_SECOND } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { nowInSeconds } from '@utils/date';
import { QUERY_KEYS } from '@utils/query';

import { findNewKnownNeuronVotes, getKnownNeuronVotes, KnownNeuronVote } from '../knownNeuronVotes';

// The page polls governance this often while the proposal takes votes and the tab is visible.
export const LIVE_POLL_INTERVAL_MS = 15_000;

// A response stamps the time it arrived, not the time governance read it, and the clocks can
// differ. Only a read this long after the deadline holds the final tally.
const FINAL_READ_MARGIN_SECONDS = 60;

export const isTakingVotes = (proposal: ProposalInfo): boolean =>
  Number(proposal.deadlineTimestampSeconds ?? 0n) > nowInSeconds();

// Yes and No only rise, so the tally with more votes is the newer one.
const isNewerTally = (tally: Tally, than: Tally | undefined) =>
  isNullish(than) || tally.yes + tally.no > than.yes + than.no;

/**
 * The proposal with its latest tally and deadline: wait for quiet can extend the deadline. While
 * the proposal takes votes, a query call reads both again at each poll, so they are not certified.
 */
export const useLiveProposal = (proposal: ProposalInfo): ProposalInfo => {
  const { ready, canister } = useNnsGovernance();
  const baseDeadline = Number(proposal.deadlineTimestampSeconds ?? 0n);

  // The latest deadline seen, and whether a read after it holds the final tally.
  const getDeadline = (polled: ProposalInfo | null | undefined) =>
    Math.max(baseDeadline, Number(polled?.deadlineTimestampSeconds ?? 0n));
  const hasFinalRead = ({
    state,
  }: {
    state: { data?: ProposalInfo | null; dataUpdatedAt: number };
  }) =>
    state.dataUpdatedAt / MILLISECONDS_IN_SECOND >
    getDeadline(state.data) + FINAL_READ_MARGIN_SECONDS;

  const { data: polled } = useQuery({
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
      return proposals.find(({ id }) => id === proposal.id) ?? null;
    },
    // A proposal that closed before the page opened needs no read. One that closes while the page
    // is open gets one read after its deadline, also when the tab comes back from the background.
    enabled: (query) =>
      ready &&
      !isNullish(proposal.id) &&
      (isTakingVotes(proposal) || query.state.data !== undefined),
    staleTime: (query) => (hasFinalRead(query) ? Infinity : 0),
    refetchInterval: (query) => (hasFinalRead(query) ? false : LIVE_POLL_INTERVAL_MS),
  });

  if (!polled) return proposal;

  const deadlineTimestampSeconds =
    (polled.deadlineTimestampSeconds ?? 0n) > (proposal.deadlineTimestampSeconds ?? 0n)
      ? polled.deadlineTimestampSeconds
      : proposal.deadlineTimestampSeconds;
  const latestTally =
    polled.latestTally && isNewerTally(polled.latestTally, proposal.latestTally)
      ? polled.latestTally
      : proposal.latestTally;

  return { ...proposal, deadlineTimestampSeconds, latestTally };
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
      // A new key at the deadline reads the ballots one last time.
      live,
    ],
    queryFn: () =>
      canister!.listNeurons({
        certified: false,
        neuronIds,
        includeEmptyNeurons: true,
        includePublicNeurons: true,
      }),
    enabled: ready && !isNullish(neuronIds) && neuronIds.length > 0 && !isNullish(proposal.id),
    // Keeps the grid on screen while the last read at the deadline runs.
    placeholderData: (previous) => previous,
    staleTime: live ? LIVE_POLL_INTERVAL_MS : Infinity,
    refetchInterval: live ? LIVE_POLL_INTERVAL_MS : false,
  });

  const votes =
    knownNeurons && query.data && !isNullish(proposal.id)
      ? getKnownNeuronVotes({ knownNeurons, neurons: query.data, proposalId: proposal.id })
      : undefined;

  return { votes, isError: query.isError, dataUpdatedAt: query.dataUpdatedAt };
};

export type SeenVote = { vote: KnownNeuronVote; seenAtMs: number };

/** The known neuron votes that appear while the page is open, with the time the poll saw them. */
export const useSeenVotes = (votes: KnownNeuronVote[] | undefined): SeenVote[] => {
  const previousRef = useRef<KnownNeuronVote[] | undefined>(undefined);
  const [seen, setSeen] = useState<SeenVote[]>([]);

  useEffect(() => {
    if (!votes) return;
    const previous = previousRef.current;
    previousRef.current = votes;
    if (!previous) return;

    const added = findNewKnownNeuronVotes(previous, votes);
    if (added.length === 0) return;
    const seenAtMs = Date.now();
    setSeen((current) => [...added.map((vote) => ({ vote, seenAtMs })), ...current]);
  }, [votes]);

  return seen;
};
