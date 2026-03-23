import {
  type FolloweesForTopic,
  type KnownNeuron,
  type NeuronId,
  Topic,
} from '@icp-sdk/canisters/nns';

import { DFINITY_NEURON_ID } from '@common/constants/neuron';

import { KNOWN_NEURONS_SORTING_MAP } from '../data/knownNeuronsSorting';
import { TOP_LEVEL_TOPICS } from '../data/topics';
import { buildAdvancedTopicFollowing } from './topicFollowing';

// Neurons that have not participated yet and should be removed
const PENALIZED_NEURON_IDS = [
  428687636340283207n, // CryptoIsGood
  4714336137769716208n, // ELNA AI
  1100477100620240869n, // ICP Hub Bulgaria
  2776371642396604393n, // ICP Hub México
  55674167450360693n, // ICPL.app
  5728549712200490799n, // ICPMANUAL
  8777656085298269769n, // Paul Young
  10323780370508631162n, // Sonic AMM
  16673157401414569992n, // Yuku AI
  3172308420039087400n, // ZenithCode
];

export const isActiveKnownNeuron = (a: KnownNeuron) => !PENALIZED_NEURON_IDS.includes(a.id);

/**
 * Builds the topic following configuration for a known neuron selection (simple mode).
 * Sets the known neuron as followee for all catch-all topics (Unspecified, Governance,
 * SnsAndCommunityFund), clears followees for all other topics.
 */
export const buildKnownNeuronTopicFollowing = (knownNeuronId: NeuronId): FolloweesForTopic[] => {
  const topicFollowees = new Map<Topic, bigint[]>();
  for (const { topic } of TOP_LEVEL_TOPICS) {
    topicFollowees.set(topic, [knownNeuronId]);
  }
  return buildAdvancedTopicFollowing(topicFollowees);
};

export const sortKnownNeurons = (a: KnownNeuron, b: KnownNeuron) => {
  const aSortData = KNOWN_NEURONS_SORTING_MAP[String(a.id)];
  const bSortData = KNOWN_NEURONS_SORTING_MAP[String(b.id)];

  if (aSortData && bSortData) return aSortData.index - bSortData.index;

  if (aSortData) return -1;
  if (bSortData) return 1;

  if (a.id === DFINITY_NEURON_ID) return -1;
  if (b.id === DFINITY_NEURON_ID) return 1;

  return a.id < b.id ? -1 : 1;
};
