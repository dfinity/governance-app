/////////////////
/// ORIGINAL DOC REFERENCE (IMPLEMENTATION REWORKED FOR THE NEW APP)
/// https://docs.google.com/document/d/1jjglDtCZpdTHwPLB1hwW_oR-p4jU_t6ad1Gmw5bbiBk
/////////////////

import {
  GovernanceCachedMetrics,
  NetworkEconomics,
  NeuronInfo,
  NeuronState,
} from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';

import { StakingWizardDissolveDelayPreset } from '@features/stakes/components/stakingWizard/types';

import { CANISTER_ID_SELF } from '@constants/canisterIds';
import {
  DAYS_IN_AVG_YEAR,
  E8S,
  IS_TESTNET,
  MAX_AGE_BONUS,
  MAX_DISSOLVE_DELAY_BONUS,
  NNS_FINAL_REWARD_RATE,
  NNS_GENESIS_TIMESTAMP_SECONDS,
  NNS_INITIAL_REWARD_RATE,
  POOL_REDUCTION_FACTOR,
  SECONDS_IN_DAY,
  SECONDS_IN_EIGHT_YEARS,
  SECONDS_IN_FOUR_YEARS,
} from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS, ICP_MIN_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { nowInSeconds } from '@utils/date';
import {
  cloneNeurons,
  getEightYearGangBonusE8s,
  getNeuronBonusRatio,
  getNeuronId,
  getNeuronStakeAfterFeesE8s,
  getNeuronTotalMaturityE8s,
  getNeuronTotalStakeAfterFeesE8s,
  getNeuronTotalValueAfterFeesE8s,
  increaseNeuronMaturity,
  isNeuronEligibleToVote,
  maximiseNeuronParams,
} from '@utils/neuron';
import { getStakingRewardsTestNeuron } from '@utils/staking-rewards-test';

import { logWithTimestamp } from '@/dev/log';

////////////// STAKING FLOW APY COMBINATIONS

// Dissolve-delay durations (in seconds) for which we precompute an APY preview.
// Reuses the wizard presets as the single source of truth.
const stakingFlowApyDissolveDelaySeconds = Object.values(StakingWizardDissolveDelayPreset);

type StakingFlowApyPreview = Record<
  StakingWizardDissolveDelayPreset,
  {
    autoStake: {
      dissolving: number;
      locked: number;
    };
    nonAutoStake: {
      dissolving: number;
      locked: number;
    };
  }
>;

/////////////

export enum APY_CALC_ERROR {
  MISSING_DATA,
  UNEXPECTED,
}

export type APY = {
  cur: number;
  max: number;
  neurons: Map<
    string,
    {
      cur: number;
      max: number;
    }
  >;
  error?: APY_CALC_ERROR;
};

export enum MaturityEstimatePeriod {
  DAY = 1,
  WEEK = 7,
  MONTH = 30,
  THREE_MONTHS = 91,
  SIX_MONTHS = 182,
  YEAR = 365,
}

export type StakingRewardData = {
  rewardEstimates: Map<MaturityEstimatePeriod, number>;
  stakingFlowApyPreview: StakingFlowApyPreview;
  rewardBalance: number;
  stakingRatio: number;
  loading: false;
  apy: APY;
};

export type StakingRewardResult =
  | { loading: true }
  | StakingRewardData
  | {
      loading: false;
      error: string;
    };

export interface StakingRewardCalcParams {
  governanceMetrics: GovernanceCachedMetrics;
  economics: NetworkEconomics;
  isAuthenticated: boolean;
  totalVotingPower: bigint;
  neurons: NeuronInfo[];
  balance: number;
}

export const isStakingRewardDataReady = (data?: StakingRewardResult): data is StakingRewardData =>
  !!data && !data.loading && !('error' in data);

export const isStakingRewardDataError = (data?: StakingRewardResult) =>
  !!data && !data.loading && 'error' in data;

export const isStakingRewardDataLoading = (data?: StakingRewardResult) => !!data && data.loading;

export const getStakingRewardData = (
  params: Partial<StakingRewardCalcParams>,
  forceInitialDate?: Date, // Force the initial date (for testing purposes).
): StakingRewardResult => {
  if (!params.isAuthenticated) {
    logWithTimestamp('Staking rewards: user is not logged in.');
    return { loading: false, error: 'Not authorized.' };
  }

  if (isDataReady(params)) {
    logWithTimestamp('Staking rewards: data is available.');
    logWithTimestamp('Staking rewards: start calculation...');

    try {
      const apySimulation = getAPYs(params, forceInitialDate);
      const res: StakingRewardResult = {
        loading: false,
        rewardBalance: getRewardBalance(params),
        rewardEstimates: apySimulation.curPeriodsRewards,
        stakingRatio: getStakingPower(params),
        apy: apySimulation,
        stakingFlowApyPreview: getStakingFlowApyPreview(params, forceInitialDate),
      };
      logWithTimestamp('Staking rewards: calculation completed, fields ready.');
      return res;
    } catch (e) {
      logWithTimestamp('Staking rewards: error during calculation.', e);
      return { loading: false, error: 'Error during calculation.' };
    }
  } else {
    logWithTimestamp('Staking rewards: waiting for data...');
    return { loading: true };
  }
};

const getRewardBalance = ({ neurons }: StakingRewardCalcParams): number => {
  let totalReward = 0;
  neurons.forEach((neuron) => {
    try {
      totalReward += bigIntDiv(getNeuronTotalMaturityE8s(neuron), BigInt(E8S), 20);
    } catch (e) {
      let message = `Staking rewards: unexpected error calculating NNS reward balance, ignoring neuron ${neuron.neuronId}.`;
      if (e instanceof ApyMissingDataError) {
        message = `Staking rewards: error calculating NNS reward balance, data is missing, ignoring neuron ${neuron.neuronId}.`;
      }
      logWithTimestamp(message, e);
    }
  });

  return totalReward;
};

const getStakingPower = ({ neurons, balance }: StakingRewardCalcParams) => {
  let totalStaked = 0;
  neurons.forEach((neuron) => {
    try {
      const staked = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), BigInt(E8S), 20);
      totalStaked += staked;
    } catch (e) {
      let message = `Staking rewards: unexpected error calculating NNS staking power, ignoring neuron ${neuron.neuronId}.`;
      if (e instanceof ApyMissingDataError) {
        message = `Staking rewards: error calculating NNS staking power, data is missing, ignoring neuron ${neuron.neuronId}.`;
      }
      logWithTimestamp(message, e);
    }
  });

  const totalValue = totalStaked + balance;
  return totalValue ? totalStaked / totalValue : 0;
};

const getAPYs = (params: StakingRewardCalcParams, forceInitialDate?: Date) => {
  try {
    return getAPY(params, forceInitialDate);
  } catch (e) {
    let message = `Staking rewards: unexpected error calculating NNS APY, using 0.`;
    let error = APY_CALC_ERROR.UNEXPECTED;
    if (e instanceof ApyMissingDataError) {
      message = `Staking rewards: error calculating NNS APY, data is missing, using 0.`;
      error = APY_CALC_ERROR.MISSING_DATA;
    }
    logWithTimestamp(message, e);
    return {
      cur: 0,
      curPeriodsRewards: new Map(),
      max: 0,
      neurons: new Map(),
      error,
    };
  }
};

// Length of the forward simulation. Integer days because the simulation
// iterates day-by-day; not interchangeable with DAYS_IN_AVG_YEAR (365.25),
// which is the calendar-year length used elsewhere for annual-rate conversions.
const SIMULATED_DAYS = 365;

// Per-neuron APY is computed as (rewards during eligibility / stake) scaled by
// (fullYearPoolSum / eligiblePoolSum). For a locked neuron eligible all year
// the scaling factor is exactly 1, so APY = rewards/stake matches the original
// "average over 365 days" definition. For a dissolving neuron eligible only
// for a short window at the start of the simulation, the scaling factor
// corrects for the fact that those early days happen to be the highest-pool
// days of the year — without it, a short-eligibility dissolving neuron could
// out-earn the equivalent locked neuron in APY just because pool decay drags
// down the locked sum but doesn't affect the dissolving extrapolation.
const annualizeWithPoolCorrection = (
  reward: number,
  stake: number,
  eligiblePoolSum: number,
  fullYearPoolSum: number,
): number => {
  if (stake <= 0 || eligiblePoolSum <= 0) return 0;
  return (reward / stake) * (fullYearPoolSum / eligiblePoolSum);
};

const getAPY = (params: StakingRewardCalcParams, forceInitialDate?: Date) => {
  // The pool reward per day depends only on the reward params and date window,
  // so compute it once and share it across the cur/max simulations and the
  // per-neuron token-reward calculations inside the loop.
  const dayPoolRewards = computeDayPoolRewards(params, SIMULATED_DAYS, forceInitialDate);
  const fullYearPoolSum = dayPoolRewards.reduce((acc, p) => acc + p, 0);

  const {
    neurons: yearEstimatedRewardNeurons,
    eligiblePoolSums: yearEstimatedEligiblePoolSums,
    periodsRewards,
  } = getNeuronsRewardEstimate(params, dayPoolRewards, false, forceInitialDate);
  const {
    neurons: yearEstimatedMaxRewardNeurons,
    eligiblePoolSums: yearEstimatedMaxEligiblePoolSums,
  } = getNeuronsRewardEstimate(params, dayPoolRewards, true, forceInitialDate);

  let total = 0;
  let totalMax = 0;
  let stakeWeightedApySum = 0;
  let stakeWeightedMaxApySum = 0;
  const singleNeuronsApy = new Map<string, { cur: number; max: number }>();

  params.neurons.forEach((neuron) => {
    const neuronTotalStake = bigIntDiv(getNeuronTotalStakeAfterFeesE8s(neuron), BigInt(E8S));
    total += neuronTotalStake;

    const neuronTotalMaxStake = bigIntDiv(
      // Considering the un-staked maturity as well
      getNeuronTotalValueAfterFeesE8s(neuron),
      BigInt(E8S),
    );
    totalMax += neuronTotalMaxStake;

    const neuronId = getNeuronId(neuron);
    const cur = annualizeWithPoolCorrection(
      yearEstimatedRewardNeurons.get(neuronId) ?? 0,
      neuronTotalStake,
      yearEstimatedEligiblePoolSums.get(neuronId) ?? 0,
      fullYearPoolSum,
    );
    const max = annualizeWithPoolCorrection(
      yearEstimatedMaxRewardNeurons.get(neuronId) ?? 0,
      neuronTotalMaxStake,
      yearEstimatedMaxEligiblePoolSums.get(neuronId) ?? 0,
      fullYearPoolSum,
    );
    singleNeuronsApy.set(neuronId, { cur, max });

    stakeWeightedApySum += cur * neuronTotalStake;
    stakeWeightedMaxApySum += max * neuronTotalMaxStake;
  });

  return {
    cur: total ? stakeWeightedApySum / total : 0,
    curPeriodsRewards: periodsRewards,
    max: totalMax ? stakeWeightedMaxApySum / totalMax : 0,
    neurons: singleNeuronsApy,
  };
};

// This doesn't change, cache for the full lifecycle of the app
const getStakingFlowApyPreviewCache: StakingFlowApyPreview | undefined = undefined;
const getStakingFlowApyPreview = (params: StakingRewardCalcParams, forceInitialDate?: Date) => {
  if (getStakingFlowApyPreviewCache) {
    return getStakingFlowApyPreviewCache;
  }

  const initialDateSeconds = forceInitialDate
    ? Math.round(forceInitialDate.getTime() / 1000)
    : nowInSeconds();

  const result: StakingFlowApyPreview = {};
  stakingFlowApyDissolveDelaySeconds.forEach((dissolveDelay) => {
    result[dissolveDelay] = {
      autoStake: { dissolving: 0, locked: 0 },
      nonAutoStake: { dissolving: 0, locked: 0 },
    };

    for (let locked = 0; locked < 2; locked++) {
      for (let autoStake = 0; autoStake < 2; autoStake++) {
        const neuron = getStakingRewardsTestNeuron(initialDateSeconds);

        neuron.fullNeuron.autoStakeMaturity = autoStake === 1;
        neuron.dissolveDelaySeconds = BigInt(dissolveDelay);

        if (locked === 1) {
          neuron.state = NeuronState.Locked;
          neuron.fullNeuron.dissolveState = {
            DissolveDelaySeconds: BigInt(dissolveDelay),
          };
        } else {
          neuron.state = NeuronState.Dissolving;
          neuron.fullNeuron.dissolveState = {
            WhenDissolvedTimestampSeconds: BigInt(initialDateSeconds + dissolveDelay),
          };
        }

        const apy = getAPY(
          { ...params, neurons: [neuron as NeuronInfo] },
          forceInitialDate,
        ).neurons.get(getNeuronId(neuron as NeuronInfo))?.cur;
        result[dissolveDelay][autoStake === 1 ? 'autoStake' : 'nonAutoStake'][
          locked === 1 ? 'locked' : 'dissolving'
        ] = apy ?? 0;
      }
    }
  });

  return result;
};

/////////////////////
/// SUPPORT FUNCTIONS
/////////////////////

const isDataReady = (
  params: Partial<StakingRewardCalcParams>,
): params is StakingRewardCalcParams => {
  const { balance, neurons, economics, governanceMetrics, totalVotingPower } = params;

  const isBalanceReady = nonNullish(balance);
  const areNeuronsReady = nonNullish(neurons);
  const isEconomicsReady = nonNullish(economics);
  const isGovernanceMetricsReady = nonNullish(governanceMetrics);
  const isTotalVotingPowerReady = nonNullish(totalVotingPower);

  return [
    isBalanceReady,
    areNeuronsReady,
    isEconomicsReady,
    isGovernanceMetricsReady,
    isTotalVotingPowerReady,
  ].every((x) => x === true);
};

// Pool reward per simulated day. Depends only on reward params and the date
// window, not on neuron state — so we compute it once per APY run and share it
// between the "cur" and "max" passes, and also thread the per-day values into
// getTokenReward so it doesn't recompute pool reward for every neuron-day.
const computeDayPoolRewards = (
  params: StakingRewardCalcParams,
  days: number,
  forceInitialDate?: Date,
): number[] => {
  const rewardParams = getRewardParams(params);
  const result: number[] = new Array(days);
  for (let i = 0; i < days; i++) {
    result[i] = getPoolReward({
      genesisTimestampSeconds: NNS_GENESIS_TIMESTAMP_SECONDS,
      referenceDate: getDate(i, forceInitialDate),
      transitionDurationSeconds: rewardParams.rewardTransition,
      initialRewardRate: rewardParams.initialReward,
      finalRewardRate: rewardParams.finalReward,
      totalSupply: rewardParams.totalSupply,
    });
  }
  return result;
};

const getNeuronsRewardEstimate = (
  params: StakingRewardCalcParams,
  dayPoolRewards: number[],
  maximiseParams: boolean = false,
  forceInitialDate?: Date,
): {
  total: number;
  neurons: Map<string, number>;
  // Sum of the pool reward over the days each neuron was eligible. Paired with
  // the externally-known full-year pool sum to compute APY with a pool-decay
  // correction, so that a dissolving neuron's short eligibility window (which
  // happens to land on the highest-pool days of the year) doesn't outrun the
  // locked equivalent.
  eligiblePoolSums: Map<string, number>;
  periodsRewards: Map<MaturityEstimatePeriod, number>;
} => {
  const { neurons: _neurons } = params;

  if (!_neurons || _neurons.length === 0) {
    return {
      total: 0,
      neurons: new Map(),
      eligiblePoolSums: new Map(),
      periodsRewards: new Map(),
    };
  }
  const neurons = cloneNeurons(_neurons);
  const rewardParams = getRewardParams(params);

  if (maximiseParams) {
    neurons.forEach((neuron) =>
      maximiseNeuronParams(neuron, rewardParams.maxDissolve, forceInitialDate),
    );
  }

  let neuronsTotalReward = 0;
  const periodsRewards = new Map<MaturityEstimatePeriod, number>();
  const neuronsRewards = new Map<string, number>();
  const eligiblePoolSums = new Map<string, number>();
  for (let i = 0; i < dayPoolRewards.length; i++) {
    const dayPoolReward = dayPoolRewards[i];
    const referenceDate = getDate(i, forceInitialDate);

    const totalDayReward = neurons.reduce((acc, neuron) => {
      let neuronVotingPower = 0n;
      const neuronId = getNeuronId(neuron);

      if (
        isNeuronEligibleToVote(
          neuron,
          rewardParams.minStake,
          rewardParams.minDissolve,
          referenceDate,
        )
      ) {
        eligiblePoolSums.set(neuronId, (eligiblePoolSums.get(neuronId) ?? 0) + dayPoolReward);

        const baseStake = getNeuronTotalStakeAfterFeesE8s(neuron);
        const eightYearGangExtra = getEightYearGangBonusE8s(neuron, referenceDate);
        const fullStake = baseStake + eightYearGangExtra;
        if (fullStake > 0n) {
          const votingPowerRatio = 1 + getNeuronBonus(params, neuron, i, forceInitialDate);
          neuronVotingPower = bigIntMul(fullStake, votingPowerRatio, 20);
        }
      }

      if (neuronVotingPower > 0n) {
        const tokenReward = getTokenReward(params, neuronVotingPower, dayPoolReward);
        neuronsRewards.set(neuronId, (neuronsRewards.get(neuronId) ?? 0) + tokenReward);

        increaseNeuronMaturity(neuron, BigInt(Math.floor(tokenReward * Number(E8S))));
        return acc + tokenReward;
      } else {
        return acc;
      }
    }, 0);

    neuronsTotalReward += totalDayReward;
    if (i + 1 in MaturityEstimatePeriod) {
      periodsRewards.set(i + 1, neuronsTotalReward);
    }
  }

  return {
    total: neuronsTotalReward,
    neurons: neuronsRewards,
    eligiblePoolSums,
    periodsRewards,
  };
};

const getDate = (addDays: number = 0, forceInitialDate?: Date): Date => {
  const now = forceInitialDate ?? new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(now.getDate() + addDays);
  return date;
};

export const getPoolReward = (params: {
  genesisTimestampSeconds: number;
  totalSupply: number;
  initialRewardRate: number;
  finalRewardRate: number;
  transitionDurationSeconds: number;
  referenceDate: Date;
}) => {
  const {
    genesisTimestampSeconds,
    totalSupply,
    initialRewardRate,
    finalRewardRate,
    transitionDurationSeconds,
    referenceDate,
  } = params;

  let rewardRate = 0;

  const durationDays = transitionDurationSeconds / SECONDS_IN_DAY;
  const elapsedDays = Math.round(
    (referenceDate.getTime() / 1000 - genesisTimestampSeconds) / SECONDS_IN_DAY,
  );

  if (elapsedDays > durationDays) {
    rewardRate = finalRewardRate;
  } else {
    const rateDiff = initialRewardRate - finalRewardRate;
    const remainingDays = durationDays - elapsedDays;
    rewardRate = finalRewardRate + rateDiff * (remainingDays / durationDays) ** 2;
  }

  return (totalSupply * rewardRate * POOL_REDUCTION_FACTOR) / DAYS_IN_AVG_YEAR;
};

const getTokenReward = (
  params: StakingRewardCalcParams,
  neuronVotingPower: bigint,
  poolReward: number,
) => {
  const totalVotingPower = params.totalVotingPower;

  if (!totalVotingPower) {
    throw new ApyMissingDataError('total voting power for ' + CANISTER_ID_SELF);
  }

  const neuronRewardRatioForTheDay = bigIntDiv(neuronVotingPower, totalVotingPower!, 20);

  if (poolReward === 0) {
    logWithTimestamp(`Staking rewards: pool reward is 0 for ${CANISTER_ID_SELF}.`);
  }

  return Math.trunc(poolReward * E8S * neuronRewardRatioForTheDay) / E8S;
};

const getNeuronBonus = (
  params: StakingRewardCalcParams,
  neuron: NeuronInfo,
  addDays: number,
  forceInitialDate?: Date,
): number =>
  getNeuronBonusRatio(neuron, {
    dissolveMax: getRewardParams(params).maxDissolve,
    dissolveBonus: getRewardParams(params).maxDissolveBonus,
    ageMax: getRewardParams(params).maxAge,
    ageBonus: getRewardParams(params).maxAgeBonus,
    referenceDate: getDate(addDays, forceInitialDate),
  });

const getRewardParams = (params: StakingRewardCalcParams) => ({
  // PocketIC has outdated data
  minDissolve: IS_TESTNET
    ? BigInt(ICP_MIN_DISSOLVE_DELAY_SECONDS)
    : (params.economics.votingPowerEconomics?.neuronMinimumDissolveDelayToVoteSeconds ?? 0n),
  minStake: params.economics.neuronMinimumStake ?? 0n,
  maxDissolve: ICP_MAX_DISSOLVE_DELAY_SECONDS,
  maxDissolveBonus: MAX_DISSOLVE_DELAY_BONUS,
  maxAge: SECONDS_IN_FOUR_YEARS,
  maxAgeBonus: MAX_AGE_BONUS,
  initialReward: NNS_INITIAL_REWARD_RATE,
  finalReward: NNS_FINAL_REWARD_RATE,
  rewardTransition: SECONDS_IN_EIGHT_YEARS,
  totalSupply: Number(params.governanceMetrics.totalSupplyIcp),
});

class ApyMissingDataError extends Error {
  constructor(message: string, ...args: ErrorOptions[]) {
    logWithTimestamp('Staking rewards: missing data for' + message + '.');
    super(message, ...args);
  }
}
