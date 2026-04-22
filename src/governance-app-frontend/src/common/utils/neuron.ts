import { type NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { type I18nSecondsToDuration, nonNullish, secondsToDuration } from '@dfinity/utils';

import { FOLLOWABLE_TOPIC_SET } from '@features/voting/utils/topicFollowing';

import {
  E8Sn,
  EIGHT_YEAR_GANG_BONUS_EXPIRY_SECONDS,
  ICP_TRANSACTION_FEE_E8Sn,
  SECONDS_IN_DAY,
  SECONDS_IN_YEAR,
} from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
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

export const getNeuronMaturityDisbursementsInProgressE8s = (neuron: NeuronInfo): bigint =>
  neuron.fullNeuron?.maturityDisbursementsInProgress?.reduce(
    (acc, disbursement) => acc + (disbursement.amountE8s ?? 0n),
    0n,
  ) ?? 0n;

export const hasValueAboveTransactionFee = (neuron: NeuronInfo): boolean =>
  nonNullish(neuron.fullNeuron)
    ? getNeuronStakeAfterFeesE8s(neuron) + getNeuronTotalMaturityE8s(neuron) >
      ICP_TRANSACTION_FEE_E8Sn
    : false;

/**
 * A neuron is considered "non-empty" if its stake + maturity exceeds the
 * transaction fee, or if a maturity disbursement is in progress.
 * Ref: https://github.com/dfinity/nns-dapp/blob/0ed30e6c92b8d813bbd6723f531dc56ab3de3f8e/frontend/src/lib/derived/neurons.derived.ts#L18
 */
export const isNonEmptyNeuron = (neuron: NeuronInfo): boolean =>
  hasValueAboveTransactionFee(neuron) || getNeuronMaturityDisbursementsInProgressE8s(neuron) > 0n;

export const getNeuronIsAutoStakingMaturity = (neuron: NeuronInfo): boolean => {
  return hasAutoStakeMaturityOn(neuron);
};

export const getNeuronIsDissolving = (neuron: NeuronInfo): boolean => {
  return neuron.state === NeuronState.Dissolving;
};

export const getNeuronIsMaxDissolveDelay = (neuron: NeuronInfo): boolean => {
  return neuron.dissolveDelaySeconds >= BigInt(ICP_MAX_DISSOLVE_DELAY_SECONDS);
};

/**
 * Returns the 8-year gang bonus in e8s to be added to the effective stake.
 * The bonus = eightYearGangBonusBaseE8s * EIGHT_YEAR_GANG_BONUS_RATE, subject to:
 * - The neuron is not dissolving (bonus is lost once dissolving starts, even if re-locked later)
 * - The field being > 0 (neuron has the 8y gang flag)
 * - The reference date being before the expiry (end of 2030)
 */
export const getEightYearGangBonusE8s = (neuron: NeuronInfo, referenceDate: Date): bigint => {
  if (getNeuronIsDissolving(neuron)) return 0n;

  const referenceDateSeconds = Math.floor(referenceDate.getTime() / 1000);
  if (referenceDateSeconds > EIGHT_YEAR_GANG_BONUS_EXPIRY_SECONDS) return 0n;

  const base: bigint =
    neuron.eightYearGangBonusBaseE8s ?? neuron.fullNeuron?.eightYearGangBonusBaseE8s ?? 0n;
  if (base <= 0n) return 0n;

  return base / 10n; // EIGHT_YEAR_GANG_BONUS_RATE = 10%
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

  // Mission 70: quadratic dissolve delay bonus f(x) = a * x^2 + 1
  // where a = dissolveBonus / maxDelayYears^2
  const dissolveSeconds = getNeuronDissolveDelaySeconds(neuron, referenceDate);
  const dissolveMaxYears = dissolveMax / SECONDS_IN_YEAR;
  const dissolveYears = Math.min(Number(dissolveSeconds) / SECONDS_IN_YEAR, dissolveMaxYears);
  const a = dissolveBonus / dissolveMaxYears ** 2;
  const dissolvingBonus = a * dissolveYears ** 2;

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

// secondsToDuration awards leap days only after full 4-year cycles (floor(N/4)),
// but SECONDS_IN_YEAR averages the leap day across every year (365.25 days).
// Uses 365.25-day years (SECONDS_IN_YEAR) throughout so that N * SECONDS_IN_YEAR
// produces exactly "N years" with no sub-day remainder, eliminating the artifact
// that secondsToDuration produces when mixing 365.25-day and 365-day year models.
const SECONDS_IN_YEAR_BIG = BigInt(SECONDS_IN_YEAR);
const SECONDS_IN_DAY_BIG = BigInt(SECONDS_IN_DAY);
const SECONDS_IN_HOUR = 3600n;
const SECONDS_IN_MINUTE = 60n;
export const formatDissolveDelay = ({
  seconds,
  i18n,
}: {
  seconds: bigint;
  i18n?: I18nSecondsToDuration;
}): string => {
  if (seconds === 0n) return '';

  const label = (n: bigint, singular: string, plural: string) =>
    `${n} ${n === 1n ? singular : plural}`;

  const years = seconds / SECONDS_IN_YEAR_BIG;
  let rem = seconds % SECONDS_IN_YEAR_BIG;
  const days = rem / SECONDS_IN_DAY_BIG;
  rem = rem % SECONDS_IN_DAY_BIG;
  const hours = rem / SECONDS_IN_HOUR;
  rem = rem % SECONDS_IN_HOUR;
  const minutes = rem / SECONDS_IN_MINUTE;
  const secs = rem % SECONDS_IN_MINUTE;

  const parts: string[] = [];
  if (years > 0n) parts.push(label(years, i18n?.year ?? 'year', i18n?.year_plural ?? 'years'));
  if (days > 0n) parts.push(label(days, i18n?.day ?? 'day', i18n?.day_plural ?? 'days'));
  if (hours > 0n) parts.push(label(hours, i18n?.hour ?? 'hour', i18n?.hour_plural ?? 'hours'));
  if (minutes > 0n) parts.push(label(minutes, i18n?.minute ?? 'minute', i18n?.minute_plural ?? 'minutes'));
  if (secs > 0n) parts.push(label(secs, i18n?.second ?? 'second', i18n?.second_plural ?? 'seconds'));

  return parts.slice(0, 2).join(', ');
};

export const getNeuronHasNoFollowing = (neuron: NeuronInfo): boolean => {
  const followees = neuron.fullNeuron?.followees ?? [];

  if (followees.length === 0) return true;

  return followees
    .filter((f) => FOLLOWABLE_TOPIC_SET.has(f.topic))
    .every((topicFollowees) => topicFollowees.followees.length === 0);
};

/**
 * Returns true if the current user is a hotkey of the neuron (and not the controller).
 * Hotkeys have limited permissions: they can vote, set followees,
 * refresh voting power, increase stake, and manage Neurons' Fund participation.
 * Everything else (dissolving, disbursing, maturity management, splitting,
 * merging, changing dissolve delay, toggling auto-stake, managing hotkeys,
 * and changing visibility) is controller-only.
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
 * @returns Object containing totalStakedAfterFees and totalMaturity
 */
export const getNeuronsAggregatedData = (
  neurons: NeuronInfo[] = [],
): { totalStakedAfterFees: number; totalMaturity: number } => {
  return neurons.reduce(
    (acc, neuron) => {
      const stake = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);
      const maturity = bigIntDiv(getNeuronTotalMaturityE8s(neuron), E8Sn);
      return {
        totalStakedAfterFees: acc.totalStakedAfterFees + stake,
        totalMaturity: acc.totalMaturity + maturity,
      };
    },
    { totalStakedAfterFees: 0, totalMaturity: 0 },
  );
};
