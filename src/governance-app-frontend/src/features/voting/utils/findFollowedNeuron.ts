import { KnownNeuron, NeuronInfo } from '@icp-sdk/canisters/nns';

type FindFollowedNeuronParams = {
  userNeurons: NeuronInfo[];
  knownNeurons: KnownNeuron[];
};

/**
 * Finds the neurons followed by the user's neurons. There are four possible scenarios:
 * 1. No followed neurons: returns an empty array.
 * 2. Consistent followed neurons: all user neurons follow the same neuron and returns that one neuron.
 * 3. Inconsistent followed neurons: user neurons follow different neurons and returns all unique followed neurons.
 * 4. Consistent followed neurons with some neurons not following anyone: returns all unique followed neurons plus `undefined`.
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
}: FindFollowedNeuronParams): (KnownNeuron | bigint | undefined)[] => {
  const followeesPerNeuron = userNeurons.map(
    (n) => n.fullNeuron?.followees?.flatMap((f) => f.followees) ?? [],
  );

  const allFollowees = followeesPerNeuron.flat();

  if (allFollowees.length === 0) return [];

  const uniqueFollowees = Array.from(new Set(allFollowees));

  const followedNeurons: (KnownNeuron | bigint | undefined)[] = uniqueFollowees.map(
    (id) => knownNeurons.find((kn) => kn.id === id) ?? id,
  );

  // If any neuron has no followees while others do, include undefined to indicate inconsistency
  const hasNeuronWithNoFollowees = followeesPerNeuron.some((f) => f.length === 0);
  if (hasNeuronWithNoFollowees) {
    followedNeurons.push(undefined);
  }

  return followedNeurons;
};

export const isKnownNeuron = (value: KnownNeuron | bigint | undefined): value is KnownNeuron =>
  value !== undefined && typeof value !== 'bigint';
