import {
  type FolloweesForTopic,
  type KnownNeuron,
  type NeuronInfo,
  Topic,
} from '@icp-sdk/canisters/nns';

import { shortenNeuronId } from '@utils/neuron';

import { ALL_FOLLOWABLE_TOPICS, CATCH_ALL_TOPICS, INDIVIDUAL_TOPICS } from '../data/topics';

export type EffectiveFollowees = {
  followees: bigint[];
  inherited: boolean;
};

export const FOLLOWABLE_TOPIC_SET = new Set(ALL_FOLLOWABLE_TOPICS);

/**
 * Extracts a per-topic followees map from a single neuron.
 * Only includes followable topics (excludes NeuronManagement, SnsDecentralizationSale).
 */
export const getFollowableTopicFolloweesMap = (neuron: NeuronInfo): Map<Topic, bigint[]> => {
  const map = new Map<Topic, bigint[]>();
  for (const entry of neuron.fullNeuron?.followees ?? []) {
    if (!FOLLOWABLE_TOPIC_SET.has(entry.topic)) continue;
    map.set(entry.topic, entry.followees);
  }
  return map;
};

/**
 * Returns the effective followees for a topic, considering inheritance.
 * Individual topics (not catch-all) inherit from Topic.Unspecified when they have no direct followees.
 */
export const getEffectiveFollowees = (
  topic: Topic,
  followeesMap: Map<Topic, bigint[]>,
): EffectiveFollowees => {
  const direct = followeesMap.get(topic) ?? [];
  if (direct.length > 0) return { followees: direct, inherited: false };

  const isCatchAll = CATCH_ALL_TOPICS.some((t) => t.topic === topic);
  if (!isCatchAll) {
    const catchAllFollowees = followeesMap.get(Topic.Unspecified) ?? [];
    if (catchAllFollowees.length > 0) return { followees: catchAllFollowees, inherited: true };
  }

  return { followees: [], inherited: false };
};

/**
 * Returns the shared per-topic config if all neurons have the same followees per topic.
 * Returns null if neurons have inconsistent configurations.
 */
export const getConsistentTopicFollowees = (neurons: NeuronInfo[]): Map<Topic, bigint[]> | null => {
  if (neurons.length === 0) return new Map();

  const firstMap = getFollowableTopicFolloweesMap(neurons[0]);

  for (let i = 1; i < neurons.length; i++) {
    const otherMap = getFollowableTopicFolloweesMap(neurons[i]);

    for (const topic of ALL_FOLLOWABLE_TOPICS) {
      const firstFollowees = (firstMap.get(topic) ?? []).toSorted();
      const otherFollowees = (otherMap.get(topic) ?? []).toSorted();

      if (firstFollowees.length !== otherFollowees.length) return null;
      if (firstFollowees.some((id, i) => id !== otherFollowees[i])) return null;
    }
  }

  return firstMap;
};

/**
 * Returns true when following can't be represented in simple mode.
 * Simple mode is: zero followees OR one single neuron for all topics across all neurons.
 * Anything else (partial coverage, per-topic config, inconsistent neurons) is complex.
 */
export const hasComplexFollowing = (neurons: NeuronInfo[]): boolean => {
  if (neurons.length === 0) return false;

  const consistent = getConsistentTopicFollowees(neurons);
  if (!consistent) return true;

  const hasAnyFollowees = Array.from(consistent.values()).some((ids) => ids.length > 0);
  if (!hasAnyFollowees) return false;

  return getSingleUniformFollowee(consistent) === undefined;
};

/**
 * Returns the single followee ID if every followable topic (considering inheritance)
 * resolves to the same single followee. Returns undefined otherwise.
 */
export const getSingleUniformFollowee = (
  followeesMap: Map<Topic, bigint[]>,
): bigint | undefined => {
  const allIds = Array.from(followeesMap.values()).flat();
  const unique = Array.from(new Set(allIds));
  if (unique.length !== 1) return undefined;
  const target = unique[0];
  const isUniform = ALL_FOLLOWABLE_TOPICS.every((topic) => {
    const { followees } = getEffectiveFollowees(topic, followeesMap);
    return followees.length === 1 && followees[0] === target;
  });
  return isUniform ? target : undefined;
};

/**
 * Returns whether a topic has effective followees configured (considering inheritance).
 */
export const isTopicConfigured = (topic: Topic, followeesMap: Map<Topic, bigint[]>): boolean => {
  return getEffectiveFollowees(topic, followeesMap).followees.length > 0;
};

/**
 * Returns the count of individual topics that have effective followees configured.
 */
export const getConfiguredIndividualTopicCount = (followeesMap: Map<Topic, bigint[]>): number => {
  return INDIVIDUAL_TOPICS.filter((t) => isTopicConfigured(t.topic, followeesMap)).length;
};

/**
 * Returns the total count of configured topics (catch-all groups counted individually,
 * not Topic.Unspecified, plus all individual topics with effective followees).
 */
export const getConfiguredTopicCount = (followeesMap: Map<Topic, bigint[]>): number => {
  const governanceConfigured = isTopicConfigured(Topic.Governance, followeesMap) ? 1 : 0;
  const snsConfigured = isTopicConfigured(Topic.SnsAndCommunityFund, followeesMap) ? 1 : 0;
  const individualCount = getConfiguredIndividualTopicCount(followeesMap);
  return governanceConfigured + snsConfigured + individualCount;
};

export const TOTAL_TOPIC_COUNT = 2 + INDIVIDUAL_TOPICS.length;

/**
 * Builds FolloweesForTopic[] for the setFollowing API.
 * Sends ALL topics explicitly (including empty arrays for unconfigured topics),
 * excluding NeuronManagement which is managed separately.
 */
export const buildAdvancedTopicFollowing = (
  topicFollowees: Map<Topic, bigint[]>,
): FolloweesForTopic[] => {
  return Object.values(Topic)
    .filter(
      (v): v is Topic =>
        typeof v === 'number' &&
        v !== Topic.NeuronManagement &&
        v !== Topic.SnsDecentralizationSale,
    )
    .map((topic) => ({
      topic,
      followees: topicFollowees.get(topic) ?? [],
    }));
};

/**
 * Maps followee neuron IDs to display names.
 * Returns the known neuron name if matched, otherwise a shortened neuron ID.
 */
export const resolveFolloweeNames = (
  followeeIds: bigint[],
  knownNeurons: KnownNeuron[],
): string[] => {
  return followeeIds.map((id) => {
    const known = knownNeurons.find((kn) => kn.id === id);
    return known?.name ?? shortenNeuronId(id);
  });
};
