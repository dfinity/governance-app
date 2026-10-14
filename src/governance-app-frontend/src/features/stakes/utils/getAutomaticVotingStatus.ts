import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import {
  getConfiguredTopicCount,
  getFollowableTopicFolloweesMap,
  TOTAL_TOPIC_COUNT,
} from '@features/voting/utils/topicFollowing';

import {
  type FollowingHealth,
  getFollowingHealth,
  getSecondsUntilDecayStarts,
  getSecondsUntilFollowingCleared,
  isUserControllerOrHotkey,
  type VotingPowerEconomicsThresholds,
} from '@utils/neuron';

/**
 * Phases of the "Automatic voting" summary card, from the most important to
 * the least important. The card shows the first phase that applies.
 */
export enum AutomaticVotingPhase {
  NotSetUp = 'notSetUp',
  FollowingCleared = 'followingCleared',
  LosingRewards = 'losingRewards',
  ConfirmSoon = 'confirmSoon',
  Partial = 'partial',
  Active = 'active',
}

export type AutomaticVotingStatus = {
  phase: AutomaticVotingPhase;
  /** Neurons that the user can refresh, with a known health that is not 'expired'. */
  confirmableNeuronIds: bigint[];
  /**
   * The nearest deadline of the phase: decay start for `ConfirmSoon` and
   * `Active`, following cleared for `LosingRewards`.
   */
  secondsLeft?: bigint;
  /** Used part (0 to 1) of the full voting power window, for `Active` only. */
  windowProgress?: number;
};

const minOf = (values: (bigint | undefined)[]): bigint | undefined =>
  values.reduce<bigint | undefined>(
    (min, value) => (value === undefined || (min !== undefined && min <= value) ? min : value),
    undefined,
  );

/**
 * Coverage uses all neurons. The confirmation phases use only the neurons that
 * the user controls or is a hotkey of, because only those can be refreshed.
 */
export function getAutomaticVotingStatus({
  neurons,
  economics,
  principalId,
  now = new Date(),
}: {
  neurons: NeuronInfo[];
  economics: VotingPowerEconomicsThresholds | undefined;
  principalId: string | undefined;
  now?: Date;
}): AutomaticVotingStatus {
  const topicCounts = neurons.map((neuron) =>
    getConfiguredTopicCount(getFollowableTopicFolloweesMap(neuron)),
  );
  const hasNoFollowing = topicCounts.every((count) => count === 0);
  const hasPartialFollowing = topicCounts.some((count) => count < TOTAL_TOPIC_COUNT);

  const refreshable = neurons
    .filter((neuron) => isUserControllerOrHotkey({ neuron, principalId }))
    .map((neuron) => ({ neuron, health: getFollowingHealth(neuron, economics, now) }));
  const confirmable = refreshable.filter(({ health }) => !!health && health !== 'expired');
  const confirmableNeuronIds = confirmable.map(({ neuron }) => neuron.neuronId);
  const withHealth = (health: FollowingHealth) =>
    refreshable.filter((entry) => entry.health === health).map(({ neuron }) => neuron);

  if (neurons.length === 0 || hasNoFollowing) {
    return { phase: AutomaticVotingPhase.NotSetUp, confirmableNeuronIds };
  }

  if (withHealth('expired').length > 0) {
    return { phase: AutomaticVotingPhase.FollowingCleared, confirmableNeuronIds };
  }

  const decaying = withHealth('decaying');
  if (decaying.length > 0) {
    return {
      phase: AutomaticVotingPhase.LosingRewards,
      confirmableNeuronIds,
      secondsLeft: minOf(
        decaying.map((neuron) => getSecondsUntilFollowingCleared(neuron, economics, now)),
      ),
    };
  }

  const warning = withHealth('warning');
  if (warning.length > 0) {
    return {
      phase: AutomaticVotingPhase.ConfirmSoon,
      confirmableNeuronIds,
      secondsLeft: minOf(
        warning.map((neuron) => getSecondsUntilDecayStarts(neuron, economics, now)),
      ),
    };
  }

  if (hasPartialFollowing) {
    return { phase: AutomaticVotingPhase.Partial, confirmableNeuronIds };
  }

  const secondsLeft = minOf(
    confirmable.map(({ neuron }) => getSecondsUntilDecayStarts(neuron, economics, now)),
  );
  const window = economics?.startReducingVotingPowerAfterSeconds;
  const windowProgress =
    secondsLeft !== undefined && !!window ? 1 - Number(secondsLeft) / Number(window) : undefined;

  return { phase: AutomaticVotingPhase.Active, confirmableNeuronIds, secondsLeft, windowProgress };
}
