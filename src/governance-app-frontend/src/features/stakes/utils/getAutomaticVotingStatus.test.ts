import type { Neuron } from '@icp-sdk/canisters/nns';
import { Topic } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { SECONDS_IN_DAY } from '@constants/extra';
import { mockNeuron } from '@fixtures/neuron';

import { AutomaticVotingPhase, getAutomaticVotingStatus } from './getAutomaticVotingStatus';

const USER = 'user-principal';
const DAY = BigInt(SECONDS_IN_DAY);
// Decay starts 180 days after the last refresh, and following is cleared 30 days later.
const ECONOMICS = {
  startReducingVotingPowerAfterSeconds: 180n * DAY,
  clearFollowingAfterSeconds: 30n * DAY,
};
const NOW = new Date('2026-01-01T00:00:00Z');
const NOW_SECONDS = BigInt(Math.floor(NOW.getTime() / 1000));

const ALL_TOPICS = [
  Topic.Unspecified,
  Topic.Governance,
  Topic.SnsAndCommunityFund,
  Topic.NetworkEconomics,
  Topic.ExchangeRate,
];

const neuron = ({
  id = 1n,
  refreshedDaysAgo = 10n,
  topics = ALL_TOPICS,
  fullNeuron = { controller: USER },
}: {
  id?: bigint;
  refreshedDaysAgo?: bigint;
  topics?: Topic[];
  fullNeuron?: Partial<Neuron>;
}) =>
  mockNeuron({
    neuronId: id,
    votingPowerRefreshedTimestampSeconds: NOW_SECONDS - refreshedDaysAgo * DAY,
    fullNeuron: {
      id,
      followees: topics.map((topic) => ({ topic, followees: [27n] })),
      ...fullNeuron,
    },
  });

const hotkeyFullNeuron = { controller: 'other-principal', hotKeys: [USER] };

const statusOf = (neurons: ReturnType<typeof neuron>[], economics = ECONOMICS) =>
  getAutomaticVotingStatus({ neurons, economics, principalId: USER, now: NOW });

describe('getAutomaticVotingStatus', () => {
  it('returns NotSetUp when no neuron has followees, before any confirmation phase', () => {
    const status = statusOf([neuron({ topics: [], refreshedDaysAgo: 190n })]);

    expect(status.phase).toBe(AutomaticVotingPhase.NotSetUp);
  });

  it('returns NotSetUp without neurons', () => {
    expect(statusOf([]).phase).toBe(AutomaticVotingPhase.NotSetUp);
  });

  it('returns FollowingCleared before LosingRewards', () => {
    const status = statusOf([
      neuron({ id: 1n, refreshedDaysAgo: 215n }),
      neuron({ id: 2n, refreshedDaysAgo: 190n }),
    ]);

    expect(status.phase).toBe(AutomaticVotingPhase.FollowingCleared);
    expect(status.confirmableNeuronIds).toEqual([2n]);
  });

  it('returns LosingRewards with the nearest clear deadline and the voting power left', () => {
    const status = statusOf([
      neuron({ id: 1n, refreshedDaysAgo: 185n }),
      neuron({ id: 2n, refreshedDaysAgo: 200n }),
      neuron({ id: 3n, refreshedDaysAgo: 170n }),
    ]);

    expect(status.phase).toBe(AutomaticVotingPhase.LosingRewards);
    expect(status.secondsLeft).toBe(10n * DAY);
    expect(status.remainingFraction).toBeCloseTo(10 / 30);
  });

  it('returns ConfirmSoon with the nearest decay start and the part of the window left', () => {
    const status = statusOf([
      neuron({ id: 1n, refreshedDaysAgo: 10n }),
      neuron({ id: 2n, refreshedDaysAgo: 163n }),
      neuron({ id: 3n, refreshedDaysAgo: 155n }),
    ]);

    expect(status.phase).toBe(AutomaticVotingPhase.ConfirmSoon);
    expect(status.secondsLeft).toBe(17n * DAY);
    expect(status.remainingFraction).toBeCloseTo(17 / 180);
  });

  it('returns ConfirmSoon before Partial', () => {
    const status = statusOf([neuron({ topics: [Topic.Governance], refreshedDaysAgo: 163n })]);

    expect(status.phase).toBe(AutomaticVotingPhase.ConfirmSoon);
  });

  it('returns Partial when some topics have no followee', () => {
    const status = statusOf([neuron({ id: 1n }), neuron({ id: 2n, topics: [Topic.Governance] })]);

    expect(status.phase).toBe(AutomaticVotingPhase.Partial);
  });

  it('returns Active with the nearest decay start and the part of the window left', () => {
    const status = statusOf([
      neuron({ id: 1n, refreshedDaysAgo: 45n }),
      neuron({ id: 2n, refreshedDaysAgo: 90n }),
    ]);

    expect(status).toEqual({
      phase: AutomaticVotingPhase.Active,
      confirmableNeuronIds: [1n, 2n],
      secondsLeft: 90n * DAY,
      remainingFraction: 0.5,
    });
  });

  it('includes hotkey neurons in the confirmation phases', () => {
    const status = statusOf([
      neuron({ id: 1n }),
      neuron({ id: 2n, refreshedDaysAgo: 190n, fullNeuron: hotkeyFullNeuron }),
    ]);

    expect(status.phase).toBe(AutomaticVotingPhase.LosingRewards);
    expect(status.confirmableNeuronIds).toEqual([1n, 2n]);
  });

  it('ignores neurons that the user cannot refresh', () => {
    const status = statusOf([
      neuron({ id: 1n }),
      neuron({ id: 2n, refreshedDaysAgo: 190n, fullNeuron: { controller: 'other-principal' } }),
    ]);

    expect(status.phase).toBe(AutomaticVotingPhase.Active);
    expect(status.confirmableNeuronIds).toEqual([1n]);
  });

  it('returns Active without a deadline or confirmable neurons when economics are missing', () => {
    const status = getAutomaticVotingStatus({
      neurons: [neuron({})],
      economics: undefined,
      principalId: USER,
      now: NOW,
    });

    expect(status).toEqual({
      phase: AutomaticVotingPhase.Active,
      confirmableNeuronIds: [],
      secondsLeft: undefined,
      remainingFraction: undefined,
    });
  });
});
