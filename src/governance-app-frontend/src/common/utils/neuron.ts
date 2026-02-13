import { type NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';

import { E8Sn, SECONDS_IN_EIGHT_YEARS } from '@constants/extra';
import { bigIntDiv, bigIntMax } from '@utils/bigInt';
import { nowInSeconds } from '@utils/date';
import { shortenId } from '@utils/id';

export const getNeuronId = (neuron: NeuronInfo): string => {
  return String(neuron.neuronId);
};

export const shortenNeuronId = (neuronId: bigint): string => {
  return shortenId(neuronId.toString(), 5);
};

export const getNeuronIsDissolved = (neuron: NeuronInfo): boolean => {
  return neuron.state === NeuronState.Dissolved;
};

export const getNeuronFreeMaturityE8s = (neuron: NeuronInfo): bigint => {
  return neuron.fullNeuron?.maturityE8sEquivalent ?? 0n;
};

export const getNeuronStakedMaturityE8s = (neuron: NeuronInfo): bigint => {
  return neuron.fullNeuron?.stakedMaturityE8sEquivalent ?? 0n;
};

export const getNeuronTotalMaturityE8s = (neuron: NeuronInfo): bigint => {
  return getNeuronFreeMaturityE8s(neuron) + getNeuronStakedMaturityE8s(neuron);
};

export const getNeuronStakeE8s = (neuron: NeuronInfo): bigint => {
  return neuron.fullNeuron?.cachedNeuronStake ?? 0n;
};

export const getNeuronFeesE8s = (neuron: NeuronInfo): bigint => {
  return neuron.fullNeuron?.neuronFees ?? 0n;
};

export const getNeuronStakeAfterFeesE8s = (neuron: NeuronInfo): bigint => {
  return bigIntMax(getNeuronStakeE8s(neuron) - getNeuronFeesE8s(neuron), 0n);
};

export const getNeuronTotalStakeAfterFeesE8s = (neuron: NeuronInfo): bigint => {
  return getNeuronStakeAfterFeesE8s(neuron) + getNeuronStakedMaturityE8s(neuron);
};

export const getNeuronTotalValueAfterFeesE8s = (neuron: NeuronInfo): bigint => {
  return getNeuronTotalStakeAfterFeesE8s(neuron) + getNeuronFreeMaturityE8s(neuron);
};

export const getNeuronIsAutoStakingMaturity = (neuron: NeuronInfo): boolean => {
  return hasAutoStakeMaturityOn(neuron);
};

export const getNeuronIsDissolving = (neuron: NeuronInfo): boolean => {
  return neuron.state === NeuronState.Dissolving;
};

export const getNeuronIsMaxDissolveDelay = (neuron: NeuronInfo): boolean => {
  return neuron.dissolveDelaySeconds >= BigInt(SECONDS_IN_EIGHT_YEARS);
};

export const getNeuronDissolveDelaySeconds = (neuron: NeuronInfo, referenceDate?: Date): bigint => {
  if (getNeuronIsDissolving(neuron)) {
    return getDissolvingTimeInSeconds(neuron, referenceDate) ?? 0n;
  }
  return getLockedTimeInSeconds(neuron) ?? 0n;
};

export const getNeuronAgeSeconds = (
  neuron: NeuronInfo,
  referenceDate: Date = new Date(),
): number => {
  if (getNeuronIsDissolving(neuron)) {
    return 0;
  }

  const agingSinceTimestampSeconds = Number(neuron.fullNeuron?.agingSinceTimestampSeconds ?? 0);
  return Math.max(referenceDate.getTime() / 1000 - agingSinceTimestampSeconds, 0);
};

export const isNeuronEligibleToVote = (
  neuron: NeuronInfo,
  minimumStakeE8s: bigint,
  minDissolveDelaySeconds: bigint,
  referenceDate?: Date,
): boolean =>
  getNeuronStakeE8s(neuron) >= minimumStakeE8s &&
  getNeuronDissolveDelaySeconds(neuron, referenceDate) >= minDissolveDelaySeconds;

export const maximiseNeuronParams = (
  neuron: NeuronInfo,
  maxDissolveSeconds: number,
  forceInitialDate?: Date, // For testing purposes
) => {
  const maxDissolve = BigInt(maxDissolveSeconds);
  const now = forceInitialDate ? Math.floor(forceInitialDate.getTime() / 1000) : nowInSeconds();

  if (neuron.fullNeuron) {
    if (getNeuronIsDissolving(neuron)) {
      neuron.fullNeuron.agingSinceTimestampSeconds = BigInt(now);
    }
    neuron.fullNeuron.dissolveState = {
      DissolveDelaySeconds: maxDissolve,
    };
    neuron.fullNeuron.stakedMaturityE8sEquivalent = getNeuronTotalMaturityE8s(neuron);
    neuron.fullNeuron.maturityE8sEquivalent = 0n;
    neuron.fullNeuron.autoStakeMaturity = true;
  }
  neuron.state = NeuronState.Locked;
  neuron.dissolveDelaySeconds = maxDissolve;
};

export const getNeuronBonusRatio = (
  neuron: NeuronInfo,
  params: {
    dissolveMax: number;
    dissolveBonus: number;
    ageMax: number;
    ageBonus: number;
    referenceDate: Date;
  },
) => {
  const { dissolveMax, dissolveBonus, ageMax, ageBonus, referenceDate } = params;
  const ageSeconds = getNeuronAgeSeconds(neuron, referenceDate);
  const agingBonus = Math.min(ageSeconds / ageMax, 1) * ageBonus;

  const dissolveSeconds = getNeuronDissolveDelaySeconds(neuron, referenceDate);
  const dissolvingBonus = Math.min(Number(dissolveSeconds) / dissolveMax, 1) * dissolveBonus;
  return (1 + dissolvingBonus) * (1 + agingBonus) - 1;
};

export const cloneNeurons = (neurons: NeuronInfo[]) => {
  return neurons.map((n) => ({
    ...n,
    fullNeuron: nonNullish(n.fullNeuron) ? { ...n.fullNeuron } : undefined,
    recentBallots: nonNullish(n.recentBallots) ? { ...n.recentBallots } : undefined,
  })) as NeuronInfo[];
};

export const increaseNeuronMaturity = (neuron: NeuronInfo, maturityE8s: bigint) => {
  if (getNeuronIsAutoStakingMaturity(neuron)) {
    const newTotal = getNeuronStakedMaturityE8s(neuron) + maturityE8s;
    neuron.fullNeuron!.stakedMaturityE8sEquivalent = newTotal;
  } else {
    const newTotal = getNeuronFreeMaturityE8s(neuron) + maturityE8s;
    neuron.fullNeuron!.maturityE8sEquivalent = newTotal;
  }
};

export const getDissolvingTimeInSeconds = (
  neuron: NeuronInfo,
  referenceDate?: Date,
): bigint | undefined => {
  const dissolvingTimestamp = getDissolvingTimestampSeconds(neuron);

  return nonNullish(dissolvingTimestamp)
    ? dissolvingTimestamp -
        BigInt(referenceDate ? Math.floor(referenceDate.getTime() / 1000) : nowInSeconds())
    : undefined;
};

export const getDissolvingTimestampSeconds = (neuron: NeuronInfo): bigint | undefined =>
  neuron.state === NeuronState.Dissolving &&
  neuron.fullNeuron?.dissolveState !== undefined &&
  'WhenDissolvedTimestampSeconds' in neuron.fullNeuron.dissolveState
    ? neuron.fullNeuron.dissolveState.WhenDissolvedTimestampSeconds
    : undefined;

export const getLockedTimeInSeconds = (neuron: NeuronInfo): bigint | undefined => {
  const neuronState = neuron.state;
  const dissolveState = neuron.fullNeuron?.dissolveState;
  if (
    neuronState === NeuronState.Locked &&
    dissolveState !== undefined &&
    'DissolveDelaySeconds' in dissolveState
  ) {
    return dissolveState.DissolveDelaySeconds;
  }
};

export const hasAutoStakeMaturityOn = ({ fullNeuron }: NeuronInfo): boolean =>
  fullNeuron?.autoStakeMaturity === true;

export const getNeuronHasNoFollowing = (neuron: NeuronInfo): boolean => {
  const followees = neuron.fullNeuron?.followees ?? [];

  if (followees.length === 0) return true;

  return followees.every((topicFollowees) => topicFollowees.followees.length === 0);
};

/**
 * Returns true if the current user is a hotkey of the neuron (and not the controller).
 * Hotkeys have limited permissions: they can only vote, set followees,
 * refresh voting power, and manage Neurons' Fund participation.
 */
export const isUserHotkey = ({
  neuron,
  principalId,
}: {
  neuron: NeuronInfo;
  principalId?: string | null;
}): boolean => {
  if (!principalId || !neuron.fullNeuron) return false;
  return (
    neuron.fullNeuron.hotKeys.some((hotkey) => hotkey === principalId) &&
    neuron.fullNeuron.controller !== principalId
  );
};

/**
 * Aggregates staking data from multiple neurons.
 * @param neurons - Array of neurons to aggregate data from
 * @returns Object containing totalStakedAfterFees and totalUnstakedMaturity
 */
export const getNeuronsAggregatedData = (
  neurons: NeuronInfo[] = [],
): { totalStakedAfterFees: number; totalUnstakedMaturity: number } => {
  return neurons.reduce(
    (acc, neuron) => {
      const stake = bigIntDiv(getNeuronTotalStakeAfterFeesE8s(neuron), E8Sn);
      const unstakedMaturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn);
      return {
        totalStakedAfterFees: acc.totalStakedAfterFees + stake,
        totalUnstakedMaturity: acc.totalUnstakedMaturity + unstakedMaturity,
      };
    },
    { totalStakedAfterFees: 0, totalUnstakedMaturity: 0 },
  );
};
