import { type KnownNeuron, type NeuronInfo, type ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';

import { isActiveKnownNeuron, sortKnownNeurons } from '@features/voting/utils/knownNeurons';

import { E8S } from '@constants/extra';

import { TallyHistory } from './tallyHistory';

// Governance keeps the latest 100 ballots of each neuron, with no timestamp.
export const MAX_RECENT_BALLOTS = 100;

export enum KnownNeuronVoteState {
  Yes = 'yes',
  No = 'no',
  // The ballot list is complete for the proposal, and it has no ballot for it.
  NotVoted = 'notVoted',
  // The ballot list is full and older than the proposal, or the neuron is not readable.
  Unknown = 'unknown',
}

export type KnownNeuronVote = {
  id: bigint;
  name: string;
  state: KnownNeuronVoteState;
};

const STATE_ORDER: KnownNeuronVoteState[] = [
  KnownNeuronVoteState.Yes,
  KnownNeuronVoteState.No,
  KnownNeuronVoteState.NotVoted,
  KnownNeuronVoteState.Unknown,
];

const getVoteState = (neuron: NeuronInfo | undefined, proposalId: bigint): KnownNeuronVoteState => {
  if (isNullish(neuron)) return KnownNeuronVoteState.Unknown;

  const ballots = neuron.recentBallots;
  const ballot = ballots.find((b) => b.proposalId === proposalId);
  if (ballot?.vote === Vote.Yes) return KnownNeuronVoteState.Yes;
  if (ballot?.vote === Vote.No) return KnownNeuronVoteState.No;

  if (ballots.length < MAX_RECENT_BALLOTS) return KnownNeuronVoteState.NotVoted;

  // The list is a ring buffer, so the lowest proposal ID marks its oldest end.
  const oldestProposalId = ballots.reduce<bigint | undefined>(
    (oldest, { proposalId: id }) =>
      isNullish(id) || (nonNullish(oldest) && oldest <= id) ? oldest : id,
    undefined,
  );
  return nonNullish(oldestProposalId) && proposalId >= oldestProposalId
    ? KnownNeuronVoteState.NotVoted
    : KnownNeuronVoteState.Unknown;
};

/**
 * The vote of each active known neuron on the proposal: Yes, then No, then the neurons that did
 * not vote, then the unknown ones. Each group keeps the known neuron order.
 */
export const getKnownNeuronVotes = ({
  knownNeurons,
  neurons,
  proposalId,
}: {
  knownNeurons: KnownNeuron[];
  neurons: NeuronInfo[];
  proposalId: bigint;
}): KnownNeuronVote[] => {
  const neuronsById = new Map(neurons.map((neuron) => [neuron.neuronId, neuron]));

  return knownNeurons
    .filter(isActiveKnownNeuron)
    .toSorted(sortKnownNeurons)
    .map((knownNeuron) => ({
      id: knownNeuron.id,
      name: knownNeuron.name,
      state: getVoteState(neuronsById.get(knownNeuron.id), proposalId),
    }))
    .toSorted((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state));
};

export const hasVoted = ({ state }: KnownNeuronVote) =>
  state === KnownNeuronVoteState.Yes || state === KnownNeuronVoteState.No;

/**
 * The known neurons that voted since the previous read. A neuron that was unknown before is not
 * new: its vote can be older than the page.
 */
export const findNewKnownNeuronVotes = (
  previous: KnownNeuronVote[],
  current: KnownNeuronVote[],
): KnownNeuronVote[] => {
  const previousStates = new Map(previous.map(({ id, state }) => [id, state]));
  return current.filter(
    (vote) => hasVoted(vote) && previousStates.get(vote.id) === KnownNeuronVoteState.NotVoted,
  );
};

export type TallyChange = {
  timestampSeconds: number;
  // Voting power added since the previous reading, in ICP.
  yes: number;
  no: number;
};

/**
 * The voting power that each collector reading added, newest first. The proposal's latest tally
 * comes last when it holds more votes than the last reading.
 */
export const getTallyChanges = ({
  history,
  proposal,
}: {
  history: TallyHistory;
  proposal: ProposalInfo;
}): TallyChange[] => {
  const track = fromNullable(history.track);
  if (isNullish(track)) return [];

  const tallies = track.readings.map(({ t, yes, no }) => ({ timestampSeconds: t, yes, no }));
  const latestTally = proposal.latestTally;
  const last = tallies.at(-1);
  if (
    nonNullish(latestTally) &&
    (isNullish(last) ||
      (latestTally.yes >= last.yes &&
        latestTally.no >= last.no &&
        (latestTally.yes > last.yes || latestTally.no > last.no)))
  ) {
    tallies.push(latestTally);
  }

  const changes: TallyChange[] = [];
  let previous = { timestampSeconds: Number(proposal.proposalTimestampSeconds), yes: 0n, no: 0n };
  for (const tally of tallies) {
    const yes = tally.yes - previous.yes;
    const no = tally.no - previous.no;
    // Yes and No only rise, so a stamp older than the one before it belongs to that earlier time.
    const timestampSeconds = Math.max(Number(tally.timestampSeconds), previous.timestampSeconds);
    if (yes > 0n || no > 0n) {
      changes.push({ timestampSeconds, yes: Number(yes) / E8S, no: Number(no) / E8S });
    }
    previous = { timestampSeconds, yes: tally.yes, no: tally.no };
  }
  return changes.reverse();
};
