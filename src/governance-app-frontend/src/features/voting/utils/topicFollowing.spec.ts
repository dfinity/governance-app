import { KnownNeuron, Topic } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import { ALL_FOLLOWABLE_TOPICS, INDIVIDUAL_TOPICS } from '../data/topics';
import {
  buildAdvancedTopicFollowing,
  getConfiguredIndividualTopicCount,
  getConfiguredTopicCount,
  getConsistentTopicFollowees,
  getEffectiveFollowees,
  getFollowableTopicFolloweesMap,
  getSingleUniformFollowee,
  hasComplexFollowing,
  resolveFolloweeNames,
  TOTAL_TOPIC_COUNT,
} from './topicFollowing';

const neuronWithFollowees = (followees: { topic: Topic; followees: bigint[] }[]) =>
  mockNeuron({ fullNeuron: { followees } });

describe('getFollowableTopicFolloweesMap', () => {
  it('returns an empty map for a neuron with no followees', () => {
    const neuron = neuronWithFollowees([]);
    expect(getFollowableTopicFolloweesMap(neuron).size).toBe(0);
  });

  it('includes followable topics', () => {
    const neuron = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n] }]);
    const map = getFollowableTopicFolloweesMap(neuron);
    expect(map.get(Topic.Governance)).toEqual([10n]);
    expect(map.size).toEqual(1);
  });

  it('excludes NeuronManagement', () => {
    const neuron = neuronWithFollowees([{ topic: Topic.NeuronManagement, followees: [10n] }]);
    const map = getFollowableTopicFolloweesMap(neuron);
    expect(map.has(Topic.NeuronManagement)).toBe(false);
    expect(map.size).toEqual(0);
  });

  it('excludes SnsDecentralizationSale', () => {
    const neuron = neuronWithFollowees([
      { topic: Topic.SnsDecentralizationSale, followees: [10n] },
    ]);
    const map = getFollowableTopicFolloweesMap(neuron);
    expect(map.has(Topic.SnsDecentralizationSale)).toBe(false);
    expect(map.size).toEqual(0);
  });

  it('handles a neuron with no fullNeuron gracefully', () => {
    const neuron = mockNeuron({ fullNeuron: undefined });
    expect(getFollowableTopicFolloweesMap(neuron).size).toBe(0);
  });

  it('handles a complex followees list', () => {
    const neuron = neuronWithFollowees([
      { topic: Topic.Governance, followees: [10n] },
      { topic: Topic.SnsAndCommunityFund, followees: [20n, 21n, 22n] },
      { topic: Topic.Unspecified, followees: [30n] },
      { topic: Topic.Kyc, followees: [40n, 41n] },
      { topic: Topic.SnsDecentralizationSale, followees: [50n, 51n, 52n] },
    ]);
    const map = getFollowableTopicFolloweesMap(neuron);
    expect(map.get(Topic.Governance)).toEqual([10n]);
    expect(map.get(Topic.SnsAndCommunityFund)).toEqual([20n, 21n, 22n]);
    expect(map.get(Topic.Unspecified)).toEqual([30n]);
    expect(map.get(Topic.Kyc)).toEqual([40n, 41n]);
    expect(map.has(Topic.SnsDecentralizationSale)).toBe(false);
    expect(map.size).toEqual(4);
  });
});

describe('getEffectiveFollowees', () => {
  it('returns direct followees when they exist', () => {
    const map = new Map([
      [Topic.Governance, [10n]],
      [Topic.SnsAndCommunityFund, [20n, 21n, 22n]],
    ]);
    let result = getEffectiveFollowees(Topic.Governance, map);
    expect(result).toEqual({ followees: [10n], inherited: false });
    result = getEffectiveFollowees(Topic.SnsAndCommunityFund, map);
    expect(result).toEqual({ followees: [20n, 21n, 22n], inherited: false });
  });

  it('does not inherit for top-level topics', () => {
    const map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.SnsAndCommunityFund, [20n, 21n, 22n]],
    ]);
    let result = getEffectiveFollowees(Topic.Governance, map);
    expect(result).toEqual({ followees: [], inherited: false });
    result = getEffectiveFollowees(Topic.SnsAndCommunityFund, map);
    expect(result).toEqual({ followees: [20n, 21n, 22n], inherited: false });
  });

  it('inherits from Unspecified for individual topics with no direct followees', () => {
    const map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.SnsAndCommunityFund, [20n, 21n, 22n]],
    ]);
    let result = getEffectiveFollowees(Topic.ExchangeRate, map);
    expect(result).toEqual({ followees: [10n], inherited: true });
    result = getEffectiveFollowees(Topic.Kyc, map);
    expect(result).toEqual({ followees: [10n], inherited: true });
    result = getEffectiveFollowees(Topic.IcOsVersionElection, map);
    expect(result).toEqual({ followees: [10n], inherited: true });
  });

  it('prefers direct over inherited for individual topics', () => {
    const map = new Map([
      [Topic.Unspecified, [10n, 11n, 12n]],
      [Topic.ExchangeRate, [20n, 21n, 22n]],
      [Topic.Kyc, [30n, 31n, 32n]],
    ]);
    let result = getEffectiveFollowees(Topic.ExchangeRate, map);
    expect(result).toEqual({ followees: [20n, 21n, 22n], inherited: false });
    result = getEffectiveFollowees(Topic.Kyc, map);
    expect(result).toEqual({ followees: [30n, 31n, 32n], inherited: false });
  });

  it('returns empty when nothing is configured', () => {
    const result = getEffectiveFollowees(Topic.Governance, new Map());
    expect(result).toEqual({ followees: [], inherited: false });
  });
});

describe('getConsistentTopicFollowees', () => {
  it('returns an empty map for empty neuron array', () => {
    const result = getConsistentTopicFollowees([]);
    expect(result).toEqual(new Map());
  });

  it('returns the map for a single neuron', () => {
    const neuron = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n] }]);
    const result = getConsistentTopicFollowees([neuron]);
    expect(result).not.toBeNull();
    expect(result!.get(Topic.Governance)).toEqual([10n]);
    expect(result!.size).toEqual(1);
  });

  it('returns the map when two neurons have the same config', () => {
    const followees = [{ topic: Topic.Governance, followees: [10n] }];
    const result = getConsistentTopicFollowees([
      neuronWithFollowees(followees),
      neuronWithFollowees(followees),
    ]);
    expect(result).not.toBeNull();
    expect(result!.get(Topic.Governance)).toEqual([10n]);
    expect(result!.size).toEqual(1);
  });

  it('returns null when neurons have different followees on the same topic', () => {
    const n1 = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n] }]);
    const n2 = neuronWithFollowees([{ topic: Topic.Governance, followees: [20n] }]);
    expect(getConsistentTopicFollowees([n1, n2])).toBeNull();
  });

  it('returns null when neurons have different followee counts', () => {
    const n1 = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n] }]);
    const n2 = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n, 20n] }]);
    expect(getConsistentTopicFollowees([n1, n2])).toBeNull();
  });

  it('treats same followees in different order as consistent', () => {
    const n1 = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n, 20n] }]);
    const n2 = neuronWithFollowees([{ topic: Topic.Governance, followees: [20n, 10n] }]);
    expect(getConsistentTopicFollowees([n1, n2])).not.toBeNull();
  });

  it('returns null when neurons have different followees on different topics', () => {
    const n1 = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n] }]);
    const n2 = neuronWithFollowees([{ topic: Topic.SnsAndCommunityFund, followees: [10n] }]);
    expect(getConsistentTopicFollowees([n1, n2])).toBeNull();
  });

  it('returns null when one neuron has no followees and the other has followees', () => {
    const n1 = neuronWithFollowees([{ topic: Topic.Governance, followees: [10n] }]);
    const n2 = neuronWithFollowees([]);
    expect(getConsistentTopicFollowees([n1, n2])).toBeNull();
  });
});

describe('hasComplexFollowing', () => {
  it('returns false for empty neuron array', () => {
    expect(hasComplexFollowing([])).toBe(false);
  });

  it('returns false when no followees are configured', () => {
    expect(hasComplexFollowing([neuronWithFollowees([])])).toBe(false);
  });

  it('returns false when no followees are configured on multiple neurons', () => {
    const n1 = neuronWithFollowees([]);
    const n2 = neuronWithFollowees([]);
    const n3 = neuronWithFollowees([]);
    expect(hasComplexFollowing([n1, n2, n3])).toBe(false);
  });

  it('returns false for uniform single-followee config via Unspecified + top-level', () => {
    const n1 = neuronWithFollowees([
      { topic: Topic.Unspecified, followees: [10n] },
      { topic: Topic.Governance, followees: [10n] },
      { topic: Topic.SnsAndCommunityFund, followees: [10n] },
    ]);
    const n2 = neuronWithFollowees([
      { topic: Topic.Unspecified, followees: [10n] },
      { topic: Topic.Governance, followees: [10n] },
      { topic: Topic.SnsAndCommunityFund, followees: [10n] },
    ]);
    expect(hasComplexFollowing([n1, n2])).toBe(false);
  });

  it('returns true when neurons are inconsistent', () => {
    const n1 = neuronWithFollowees([
      { topic: Topic.Unspecified, followees: [10n] },
      { topic: Topic.Governance, followees: [10n] },
      { topic: Topic.SnsAndCommunityFund, followees: [10n] },
    ]);
    const n2 = neuronWithFollowees([
      { topic: Topic.Unspecified, followees: [10n] },
      { topic: Topic.Governance, followees: [20n] },
      { topic: Topic.SnsAndCommunityFund, followees: [10n] },
    ]);
    expect(hasComplexFollowing([n1, n2])).toBe(true);
  });

  it('returns true for partial topic coverage', () => {
    const n1 = neuronWithFollowees([
      { topic: Topic.SnsAndCommunityFund, followees: [10n] },
      { topic: Topic.Governance, followees: [10n] },
    ]);
    const n2 = neuronWithFollowees([
      { topic: Topic.SnsAndCommunityFund, followees: [10n] },
      { topic: Topic.Governance, followees: [10n] },
    ]);
    expect(hasComplexFollowing([n1, n2])).toBe(true);
  });
});

describe('getSingleUniformFollowee', () => {
  it('returns the followee when every topic resolves to the same single ID, via inheritance or directly', () => {
    let map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.Governance, [10n]],
      [Topic.SnsAndCommunityFund, [10n]],
    ]);
    expect(getSingleUniformFollowee(map)).toBe(10n);

    map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.Governance, [10n]],
      [Topic.SnsAndCommunityFund, [10n]],
      [Topic.Kyc, [10n]],
      [Topic.ExchangeRate, [10n]],
    ]);
    expect(getSingleUniformFollowee(map)).toBe(10n);

    map = new Map([]);
    ALL_FOLLOWABLE_TOPICS.forEach((topic) => {
      map.set(topic, [10n]);
    });
    map.delete(Topic.Unspecified);
    expect(getSingleUniformFollowee(map)).toBeUndefined();
    map.delete(Topic.Kyc);
    expect(getSingleUniformFollowee(map)).toBeUndefined();
    map.set(Topic.Unspecified, [10n]);
    expect(getSingleUniformFollowee(map)).toBe(10n);
  });

  it('returns undefined when map is empty', () => {
    expect(getSingleUniformFollowee(new Map())).toBeUndefined();
  });

  it('returns undefined when different topics have different followees', () => {
    const map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.Governance, [10n]],
      [Topic.SnsAndCommunityFund, [20n]],
    ]);
    expect(getSingleUniformFollowee(map)).toBeUndefined();
  });

  it('returns undefined when a topic has multiple followees', () => {
    const map = new Map([
      [Topic.Unspecified, [10n, 20n]],
      [Topic.Governance, [10n, 20n]],
      [Topic.SnsAndCommunityFund, [10n, 20n]],
    ]);
    expect(getSingleUniformFollowee(map)).toBeUndefined();
  });

  it('returns undefined when a topic has no followees', () => {
    const map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.SnsAndCommunityFund, [10n]],
      [Topic.Kyc, [10n]],
      [Topic.ExchangeRate, [10n]],
    ]);
    expect(getSingleUniformFollowee(map)).toBeUndefined();
  });
});

describe('getConfiguredIndividualTopicCount', () => {
  it('returns 0 for an empty map', () => {
    expect(getConfiguredIndividualTopicCount(new Map())).toBe(0);
  });

  it('counts individual topics that inherit from Unspecified', () => {
    const map = new Map([[Topic.Unspecified, [10n]]]);
    expect(getConfiguredIndividualTopicCount(map)).toBe(INDIVIDUAL_TOPICS.length);
  });

  it('counts individual topics that are directly configured', () => {
    const map = new Map([[Topic.ApiBoundaryNodeManagement, [10n, 20n, 30n]]]);
    expect(getConfiguredIndividualTopicCount(map)).toBe(1);
  });

  it('counts mixed inheritance and direct followees', () => {
    const map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.Governance, [10n]],
      [Topic.SnsAndCommunityFund, [10n, 20n, 30n]],
      [Topic.Kyc, [10n]],
      [Topic.ExchangeRate, [10n, 20n, 30n]],
    ]);
    expect(getConfiguredIndividualTopicCount(map)).toBe(INDIVIDUAL_TOPICS.length);
  });
});

describe('getConfiguredTopicCount', () => {
  it('returns 0 for an empty map', () => {
    expect(getConfiguredTopicCount(new Map())).toBe(0);
  });

  it('counts Governance + SnsAndCommunityFund + Unspecified topics', () => {
    const map = new Map([
      [Topic.Governance, [10n]],
      [Topic.SnsAndCommunityFund, [10n]],
      [Topic.Unspecified, [10n]],
    ]);
    expect(getConfiguredTopicCount(map)).toBe(TOTAL_TOPIC_COUNT);
  });

  it('does not count Unspecified as its own top-level entry', () => {
    const map = new Map([[Topic.Unspecified, [10n]]]);
    const count = getConfiguredTopicCount(map);
    expect(count).toBe(INDIVIDUAL_TOPICS.length);
  });

  it('counts the directly configured individual topic', () => {
    const map = new Map([
      [Topic.Governance, [10n]],
      [Topic.ApiBoundaryNodeManagement, [10n, 20n, 30n]],
      [Topic.Kyc, [10n]],
    ]);
    expect(getConfiguredTopicCount(map)).toBe(3);
  });

  it('counts mixed inheritance and direct followees', () => {
    const map = new Map([
      [Topic.Unspecified, [10n]],
      [Topic.Governance, [10n]],
      [Topic.Kyc, [10n]],
      [Topic.ExchangeRate, [10n, 20n, 30n]],
    ]);
    expect(getConfiguredTopicCount(map)).toBe(TOTAL_TOPIC_COUNT - 1);
  });
});

describe('buildAdvancedTopicFollowing', () => {
  it('excludes NeuronManagement', () => {
    const result = buildAdvancedTopicFollowing(new Map());
    expect(result.find((e) => e.topic === Topic.NeuronManagement)).toBeUndefined();
  });

  it('excludes SnsDecentralizationSale', () => {
    const result = buildAdvancedTopicFollowing(new Map());
    expect(result.find((e) => e.topic === Topic.SnsDecentralizationSale)).toBeUndefined();
  });

  it('returns empty followees for unconfigured topics', () => {
    const result = buildAdvancedTopicFollowing(new Map());
    for (const topic of ALL_FOLLOWABLE_TOPICS) {
      expect(result.find((e) => e.topic === topic)?.followees).toEqual([]);
    }
  });

  it('preserves configured followees', () => {
    const map = new Map([
      [Topic.Governance, [10n, 20n]],
      [Topic.Unspecified, [10n]],
      [Topic.Kyc, [10n, 20n, 30n]],
    ]);
    const result = buildAdvancedTopicFollowing(map);
    expect(result.length).toBe(ALL_FOLLOWABLE_TOPICS.length);
    expect(result.find((e) => e.topic === Topic.Governance)?.followees).toEqual([10n, 20n]);
    expect(result.find((e) => e.topic === Topic.Unspecified)?.followees).toEqual([10n]);
    expect(result.find((e) => e.topic === Topic.Kyc)?.followees).toEqual([10n, 20n, 30n]);
    expect(result.find((e) => e.topic === Topic.SnsAndCommunityFund)?.followees).toEqual([]);
    expect(result.find((e) => e.topic === Topic.ExchangeRate)?.followees).toEqual([]);
    expect(result.find((e) => e.topic === Topic.NetworkEconomics)?.followees).toEqual([]);
  });
});

describe('resolveFolloweeNames', () => {
  const createKnownNeuron = (id: bigint, name: string): KnownNeuron => ({
    id,
    name,
    description: '',
    links: [],
    committed_topics: [],
  });

  it('returns known neuron names when matched', () => {
    const knownNeurons = [createKnownNeuron(10n, 'DFINITY')];
    const result = resolveFolloweeNames([10n], knownNeurons);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('DFINITY');
  });

  it('returns shortened IDs for unknown neurons', () => {
    const result = resolveFolloweeNames([12345678901234n], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('...');
  });

  it('handles a mix of known and unknown', () => {
    const knownNeurons = [createKnownNeuron(10n, 'DFINITY')];
    const result = resolveFolloweeNames([10n, 99999999999999n], knownNeurons);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('DFINITY');
    expect(result[1]).toContain('...');
  });

  it('returns empty array for no followees', () => {
    expect(resolveFolloweeNames([], [])).toEqual([]);
  });
});
