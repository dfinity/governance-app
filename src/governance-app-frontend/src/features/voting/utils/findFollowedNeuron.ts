import { nonNullish } from '@dfinity/utils';
import { KnownNeuron, NeuronInfo } from '@icp-sdk/canisters/nns';

type FindFollowedNeuronParams = {
  userNeurons: NeuronInfo[];
  knownNeurons: KnownNeuron[];
};

/**
 * Finds the neurons followed by the user's neurons. There are three possible scenarios:
 * 1. No followed neurons: returns an empty array.
 * 2. Consistent followed neurons: all user neurons follow the same neuron and returns that one neuron.
 * 3. Inconsistent followed neurons: user neurons follow different neurons and returns all unique followed neurons.
 *
 * Note: It assumes that a user wants the same voting for all topics.
 *
 * @param userNeurons - An array of the user's neurons.
 * @param knownNeurons - An array of known neurons to match against.
 * @returns An array containing the followed neurons.
 */
export const getUsersFollowedNeurons = ({
  userNeurons,
  knownNeurons,
}: FindFollowedNeuronParams): (KnownNeuron | bigint)[] => {
  const userFollowees = userNeurons
    .flatMap((n) => n.fullNeuron?.followees)
    .filter(nonNullish)
    .flatMap((n) => n.followees);

  if (userFollowees.length === 0) return [];

  const uniqueFollowees = Array.from(new Set(userFollowees));

  const followedNeurons = uniqueFollowees.map((id) => {
    return knownNeurons.find((kn) => kn.id === id) ?? id;
  });

  return followedNeurons;
};

export const isKnownNeuron = (value: KnownNeuron | bigint): value is KnownNeuron =>
  typeof value !== 'bigint';
