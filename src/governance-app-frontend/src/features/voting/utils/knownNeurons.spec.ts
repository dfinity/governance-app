import { KnownNeuron, Topic } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { buildKnownNeuronTopicFollowing, sortKnownNeurons } from './knownNeurons';

describe('sortKnownNeurons', () => {
  const createMockNeuron = (id: bigint): KnownNeuron => ({
    id,
    name: `Neuron ${id}`,
    description: '',
    links: [],
    committed_topics: [],
  });

  it('prioritizes neurons in KNOWN_NEURONS_SORTING_MAP by index', () => {
    // defined in map with indices
    const id1 = 27n;
    const id2 = 33138099823745946n;
    const id3 = 4966884161088437903n;
    const unmappedId = 12345n;

    const neurons = [
      createMockNeuron(unmappedId), // Should be last
      createMockNeuron(id3),
      createMockNeuron(id1),
      createMockNeuron(id2),
    ];

    const sorted = neurons.toSorted(sortKnownNeurons);

    expect(sorted[0].id).toBe(id1);
    expect(sorted[1].id).toBe(id2);
    expect(sorted[2].id).toBe(id3);
    expect(sorted[3].id).toBe(unmappedId);
  });
});

describe('buildKnownNeuronTopicFollowing', () => {
  const knownNeuronId = 100n;

  it('sets followees for Unspecified, Governance, and SnsAndCommunityFund', () => {
    const result = buildKnownNeuronTopicFollowing(knownNeuronId);

    const followedTopics = [Topic.Unspecified, Topic.Governance, Topic.SnsAndCommunityFund];

    for (const topic of followedTopics) {
      const entry = result.find((r) => r.topic === topic);
      expect(entry).toBeDefined();
      expect(entry?.followees).toEqual([knownNeuronId]);
    }
  });

  it('clears followees for all other topics', () => {
    const result = buildKnownNeuronTopicFollowing(knownNeuronId);

    const followedTopics = new Set([
      Topic.Unspecified,
      Topic.Governance,
      Topic.SnsAndCommunityFund,
    ]);

    const clearedEntries = result.filter((r) => !followedTopics.has(r.topic));

    expect(clearedEntries.length).toBeGreaterThan(0);
    for (const entry of clearedEntries) {
      expect(entry.followees).toEqual([]);
    }
  });

  it('excludes NeuronManagement', () => {
    const result = buildKnownNeuronTopicFollowing(knownNeuronId);

    const neuronManagementEntry = result.find((r) => r.topic === Topic.NeuronManagement);
    expect(neuronManagementEntry).toBeUndefined();
  });

  it('excludes deprecated SnsDecentralizationSale', () => {
    const result = buildKnownNeuronTopicFollowing(knownNeuronId);

    const entry = result.find((r) => r.topic === Topic.SnsDecentralizationSale);
    expect(entry).toBeUndefined();
  });
});
