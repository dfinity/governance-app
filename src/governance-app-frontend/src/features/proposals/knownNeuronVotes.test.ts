import { KnownNeuron, NeuronInfo, ProposalInfo, Topic, Vote } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { E8S } from '@constants/extra';

import {
  findNewKnownNeuronVotes,
  getKnownNeuronVotes,
  getTallyChanges,
  KnownNeuronVote,
  KnownNeuronVoteState,
  MAX_RECENT_BALLOTS,
} from './knownNeuronVotes';
import { TALLY_RECORDING_SINCE_SECONDS, TallyHistory } from './tallyHistory';

const PROPOSAL_ID = 500n;
const CREATED = 1_000_000;

const knownNeuron = (id: bigint, name: string) => ({ id, name }) as KnownNeuron;

const neuron = (neuronId: bigint, ballots: [bigint, Vote][]) =>
  ({
    neuronId,
    recentBallots: ballots.map(([proposalId, vote]) => ({ proposalId, vote })),
  }) as NeuronInfo;

const fullBallots = (from: bigint): [bigint, Vote][] =>
  Array.from({ length: MAX_RECENT_BALLOTS }, (_, i) => [from + BigInt(i), Vote.Yes]);

const stateOf = (votes: KnownNeuronVote[], id: bigint) => votes.find((v) => v.id === id)?.state;

describe('getKnownNeuronVotes', () => {
  const knownNeurons = [
    knownNeuron(11n, 'Alpha'),
    knownNeuron(12n, 'Beta'),
    knownNeuron(13n, 'Gamma'),
    knownNeuron(14n, 'Delta'),
    knownNeuron(15n, 'Epsilon'),
  ];

  const votes = getKnownNeuronVotes({
    knownNeurons,
    proposalId: PROPOSAL_ID,
    neurons: [
      neuron(11n, [[PROPOSAL_ID, Vote.No]]),
      neuron(12n, [[PROPOSAL_ID, Vote.Yes]]),
      // A list with fewer than 100 ballots is complete.
      neuron(13n, [[PROPOSAL_ID - 1n, Vote.Yes]]),
      // A full list that starts after the proposal cannot tell.
      neuron(14n, fullBallots(PROPOSAL_ID + 1n)),
      // Epsilon is not readable.
    ],
  });

  it('reads the vote of each known neuron', () => {
    expect(stateOf(votes, 11n)).toBe(KnownNeuronVoteState.No);
    expect(stateOf(votes, 12n)).toBe(KnownNeuronVoteState.Yes);
    expect(stateOf(votes, 13n)).toBe(KnownNeuronVoteState.NotVoted);
    expect(stateOf(votes, 14n)).toBe(KnownNeuronVoteState.Unknown);
    expect(stateOf(votes, 15n)).toBe(KnownNeuronVoteState.Unknown);
  });

  it('puts Yes first, then No, then the neurons that did not vote, then the unknown ones', () => {
    expect(votes.map(({ state }) => state)).toEqual([
      KnownNeuronVoteState.Yes,
      KnownNeuronVoteState.No,
      KnownNeuronVoteState.NotVoted,
      KnownNeuronVoteState.Unknown,
      KnownNeuronVoteState.Unknown,
    ]);
  });

  it('counts a full list that covers the proposal as not voted', () => {
    // 100 ballots around the proposal, with none for it.
    const [vote] = getKnownNeuronVotes({
      knownNeurons: [knownNeuron(11n, 'Alpha')],
      proposalId: PROPOSAL_ID,
      neurons: [
        neuron(
          11n,
          fullBallots(PROPOSAL_ID - 50n).map(([id, vote]): [bigint, Vote] => [
            id < PROPOSAL_ID ? id : id + 1n,
            vote,
          ]),
        ),
      ],
    });
    expect(vote.state).toBe(KnownNeuronVoteState.NotVoted);
  });
});

describe('findNewKnownNeuronVotes', () => {
  const vote = (id: bigint, state: KnownNeuronVoteState): KnownNeuronVote => ({
    id,
    name: String(id),
    state,
  });

  it('returns the neurons that moved from not voted to a vote', () => {
    const previous = [
      vote(1n, KnownNeuronVoteState.NotVoted),
      vote(2n, KnownNeuronVoteState.Yes),
      vote(3n, KnownNeuronVoteState.Unknown),
      vote(4n, KnownNeuronVoteState.NotVoted),
    ];
    const current = [
      vote(1n, KnownNeuronVoteState.No),
      vote(2n, KnownNeuronVoteState.Yes),
      vote(3n, KnownNeuronVoteState.Yes),
      vote(4n, KnownNeuronVoteState.NotVoted),
    ];
    expect(findNewKnownNeuronVotes(previous, current).map(({ id }) => id)).toEqual([1n]);
  });
});

describe('getTallyChanges', () => {
  const proposal = (latestTally?: ProposalInfo['latestTally']) =>
    ({
      id: PROPOSAL_ID,
      topic: Topic.Governance,
      proposalTimestampSeconds: BigInt(CREATED),
      latestTally,
    }) as ProposalInfo;

  const e8s = (icp: number) => BigInt(icp * E8S);

  const history = (readings: [number, number, number][]): TallyHistory => ({
    recordingSince: BigInt(TALLY_RECORDING_SINCE_SECONDS),
    outages: [],
    track: [
      {
        total: e8s(1_000),
        firstReadAt: BigInt(CREATED),
        closedAt: 0n,
        finalRead: false,
        refused: 0n,
        deadlines: [],
        readings: readings.map(([t, yes, no]) => ({ t: BigInt(t), yes: e8s(yes), no: e8s(no) })),
        next: [],
      },
    ],
  });

  it('returns the voting power that each reading added, newest first', () => {
    expect(
      getTallyChanges({
        history: history([
          [CREATED + 10, 100, 0],
          [CREATED + 20, 100, 0],
          [CREATED + 30, 150, 5],
        ]),
        proposal: proposal(),
      }),
    ).toEqual([
      { timestampSeconds: CREATED + 30, yes: 50, no: 5 },
      { timestampSeconds: CREATED + 10, yes: 100, no: 0 },
    ]);
  });

  it('adds the latest tally when it holds more votes than the last reading', () => {
    const changes = getTallyChanges({
      history: history([[CREATED + 10, 100, 0]]),
      proposal: proposal({
        yes: e8s(120),
        no: 0n,
        total: e8s(1_000),
        timestampSeconds: BigInt(CREATED + 40),
      }),
    });
    expect(changes[0]).toEqual({ timestampSeconds: CREATED + 40, yes: 20, no: 0 });
  });

  it('skips a latest tally with no new votes', () => {
    const changes = getTallyChanges({
      history: history([[CREATED + 10, 100, 0]]),
      proposal: proposal({
        yes: e8s(100),
        no: 0n,
        total: e8s(1_000),
        timestampSeconds: BigInt(CREATED + 40),
      }),
    });
    expect(changes).toHaveLength(1);
  });

  it('returns nothing without a track', () => {
    expect(
      getTallyChanges({
        history: { recordingSince: 0n, outages: [], track: [] },
        proposal: proposal(),
      }),
    ).toEqual([]);
  });
});
