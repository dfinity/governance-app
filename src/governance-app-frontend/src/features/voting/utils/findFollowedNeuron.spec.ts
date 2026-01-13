import { KnownNeuron, NeuronInfo, NeuronState, Topic } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { getUsersFollowedNeurons, isKnownNeuron } from './findFollowedNeuron';

describe('getUsersFollowedNeurons', () => {
  const knownNeuronId = 100n;

  const createMockNeuron = (id: bigint, followees: bigint[] = []): NeuronInfo =>
    ({
      neuronId: id,
      fullNeuron: {
        followees: [
          {
            topic: Topic.Governance,
            followees: followees,
          },
        ],
      },
      state: NeuronState.Unspecified,
    }) as unknown as NeuronInfo;

  const createMockKnownNeuron = (id: bigint, name: string): KnownNeuron =>
    ({
      id,
      name,
      description: '',
      committed_topics: [],
    }) as unknown as KnownNeuron;

  const knownNeurons = [createMockKnownNeuron(knownNeuronId, 'Known Neuron 100')];

  it('returns an empty array when user has no neurons', () => {
    const result = getUsersFollowedNeurons({ userNeurons: [], knownNeurons });
    expect(result).toEqual([]);
  });

  it('returns an empty array when neurons have no followees', () => {
    const userNeurons = [createMockNeuron(1n), createMockNeuron(2n)];
    const result = getUsersFollowedNeurons({ userNeurons, knownNeurons });
    expect(result).toEqual([]);
  });

  it('returns a single followed known neuron', () => {
    const userNeurons = [
      createMockNeuron(1n, [knownNeuronId]),
      createMockNeuron(2n, [knownNeuronId]),
    ];
    const result = getUsersFollowedNeurons({ userNeurons, knownNeurons });

    expect(result).toHaveLength(1);

    const followedNeuron = result[0];
    expect(isKnownNeuron(followedNeuron)).toBe(true);
    expect((followedNeuron as KnownNeuron).id).toBe(100n);
  });

  it('returns a single followed unknown neuron', () => {
    const userNeurons = [createMockNeuron(1n, [500n]), createMockNeuron(2n, [500n])];
    const result = getUsersFollowedNeurons({ userNeurons, knownNeurons });

    expect(result).toHaveLength(1);

    const followedNeuron = result[0];
    expect(typeof followedNeuron).toBe('bigint');
    expect(followedNeuron).toBe(500n);
  });

  it('returns multiple followed neurons when user has a mix following', () => {
    const userNeurons = [createMockNeuron(1n, [knownNeuronId]), createMockNeuron(2n, [200n])];
    const result = getUsersFollowedNeurons({ userNeurons, knownNeurons });

    expect(result).toHaveLength(2);
    expect(isKnownNeuron(result[0])).toBe(true);
    expect((result[0] as KnownNeuron).id).toBe(knownNeuronId);

    expect(typeof result[1]).toBe('bigint');
    expect(result[1]).toBe(200n);
  });

  it('returns an array with two entries when the user has one neuron with the follow-up set and another without', () => {
    const userNeurons = [createMockNeuron(1n, [knownNeuronId]), createMockNeuron(2n, [])];

    const result = getUsersFollowedNeurons({ userNeurons, knownNeurons });

    expect(result).toHaveLength(2);
    expect(isKnownNeuron(result[0])).toBe(true);
    expect((result[0] as KnownNeuron).id).toBe(knownNeuronId);

    expect(result[1]).toBe(undefined);
  });
});

describe('isKnownNeuron', () => {
  const createMockKnownNeuron = (id: bigint, name: string): KnownNeuron =>
    ({
      id,
      name,
      description: '',
      committed_topics: [],
    }) as unknown as KnownNeuron;

  it('returns true for a KnownNeuron object', () => {
    const knownNeuron = createMockKnownNeuron(100n, 'Test Neuron');
    expect(isKnownNeuron(knownNeuron)).toBe(true);
  });

  it('returns false for a bigint value', () => {
    expect(isKnownNeuron(500n)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isKnownNeuron(undefined)).toBe(false);
  });
});
