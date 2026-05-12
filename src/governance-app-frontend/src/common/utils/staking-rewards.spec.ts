import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  E8S,
  SECONDS_IN_DAY,
  SECONDS_IN_MONTH,
  SECONDS_IN_TWO_WEEKS,
  SECONDS_IN_TWO_YEARS,
  SECONDS_IN_YEAR,
} from '@constants/extra';
import {
  getStakingRewardData,
  isStakingRewardDataError,
  isStakingRewardDataLoading,
  isStakingRewardDataReady,
  MaturityEstimatePeriod,
  StakingRewardCalcParams,
} from '@utils/staking-rewards';
import {
  getStakingRewardsInitialMockedParams,
  getStakingRewardsTestNeuron,
  inConfidenceRange,
  roundToDecimals,
  stakingRewardsTestReferenceDate,
} from '@utils/staking-rewards-test';

import { getNeuronId } from './neuron';

const checkNumber = (referenceValue: number, valueToCheck: number) => {
  // Allow for 2% deviation from the reference value.
  return inConfidenceRange(referenceValue, roundToDecimals(valueToCheck, 4), 0.02);
};

describe('staking-rewards', () => {
  let params: StakingRewardCalcParams;

  beforeEach(() => {
    // Reset params before each test to ensure a clean state
    params = getStakingRewardsInitialMockedParams() as unknown as StakingRewardCalcParams;
  });

  it('loading state if parameters are still undefined', () => {
    // @ts-expect-error - we want to test the loading case
    params.totalVotingPower = undefined;
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(true);
    expect(isStakingRewardDataError(data)).toBe(false);
    expect(isStakingRewardDataReady(data)).toBe(false);
  });

  it('error state if the user is not authenticated', () => {
    params.isAuthenticated = false;
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(false);
    expect(isStakingRewardDataError(data)).toBe(true);
    expect(isStakingRewardDataReady(data)).toBe(false);
  });

  it('error state if parameters are missing (totalSupplyIcp)', () => {
    // @ts-expect-error - we want to test the error case
    params.governanceMetrics = { totalSupplyIcp: undefined };
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(false);
    expect(isStakingRewardDataError(data)).toBe(true);
    expect(isStakingRewardDataReady(data)).toBe(false);
  });

  it('works with an empty account', () => {
    params.neurons = [];
    params.balance = 0;
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(false);
    expect(isStakingRewardDataError(data)).toBe(false);
    expect(isStakingRewardDataReady(data)).toBe(true);

    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0, data.stakingRatio)).toBe(true);
      expect(checkNumber(0, data.rewardBalance)).toBe(true);

      (Object.values(MaturityEstimatePeriod) as MaturityEstimatePeriod[]).forEach((period) => {
        expect(checkNumber(0, data.rewardEstimates.get(period) ?? 0)).toBe(true);
      });

      expect(checkNumber(0, data.apy.cur)).toBe(true);
      expect(checkNumber(0, data.apy.max)).toBe(true);
      expect(data.apy.neurons.size).toBe(0);
    }
  });

  it('calculates the staking ratio', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.33, data.stakingRatio)).toBe(true);
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.5, data.stakingRatio)).toBe(true);
    }

    params.neurons[0].fullNeuron!.maturityE8sEquivalent = BigInt(300 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.5, data.stakingRatio)).toBe(true);
    }

    params.neurons[0].fullNeuron!.stakedMaturityE8sEquivalent = BigInt(200 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.5, data.stakingRatio)).toBe(true);
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(0);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0, data.stakingRatio)).toBe(true);
    }

    params.balance = 0;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0, data.stakingRatio)).toBe(true);
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(1, data.stakingRatio)).toBe(true);
    }

    params.balance = 50;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.67, data.stakingRatio)).toBe(true);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.75, data.stakingRatio)).toBe(true);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.8, data.stakingRatio)).toBe(true);
    }

    params.neurons.at(-1)!.fullNeuron!.cachedNeuronStake = BigInt(1_000_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(1, data.stakingRatio)).toBe(true);
    }
  });

  it('calculates the reward balance', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(0);
    }

    params.neurons[0].fullNeuron!.maturityE8sEquivalent = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(100);
    }

    params.neurons[0].fullNeuron!.maturityE8sEquivalent = BigInt(1_000_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(1_000_000);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(1_000_000);
    }

    params.neurons.at(-1)!.fullNeuron!.maturityE8sEquivalent = BigInt(5_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(1_005_000);
    }

    params.neurons[0].fullNeuron!.maturityE8sEquivalent = BigInt(1 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(5_001);
    }

    params.neurons.at(-1)!.fullNeuron!.maturityE8sEquivalent = BigInt(0 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(1);
    }

    params.neurons[0].fullNeuron!.stakedMaturityE8sEquivalent = BigInt(1 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(2);
    }

    params.neurons.at(-1)!.fullNeuron!.stakedMaturityE8sEquivalent = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardBalance).toBe(102);
    }
  });

  it('calculates the staking flow APY preview', () => {
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      // APY is annualized over the eligible-to-vote window. The pool reward is
      // held at day 0 in the simulation so that locked >= dissolving at every
      // delay (otherwise pool decay over the simulated year would let
      // short-eligibility dissolving neurons appear to out-earn the equivalent
      // locked neuron).
      expect(
        checkNumber(0.0237, data.stakingFlowApyPreview[SECONDS_IN_TWO_WEEKS].autoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(0.0227, data.stakingFlowApyPreview[SECONDS_IN_TWO_WEEKS].autoStake.dissolving),
      ).toBe(true);
      expect(
        checkNumber(0.0234, data.stakingFlowApyPreview[SECONDS_IN_TWO_WEEKS].nonAutoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(
          0.0227,
          data.stakingFlowApyPreview[SECONDS_IN_TWO_WEEKS].nonAutoStake.dissolving,
        ),
      ).toBe(true);

      expect(
        checkNumber(0.0244, data.stakingFlowApyPreview[3 * SECONDS_IN_MONTH].autoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(0.023, data.stakingFlowApyPreview[3 * SECONDS_IN_MONTH].autoStake.dissolving),
      ).toBe(true);
      expect(
        checkNumber(0.0241, data.stakingFlowApyPreview[3 * SECONDS_IN_MONTH].nonAutoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(
          0.023,
          data.stakingFlowApyPreview[3 * SECONDS_IN_MONTH].nonAutoStake.dissolving,
        ),
      ).toBe(true);

      expect(
        checkNumber(0.0267, data.stakingFlowApyPreview[6 * SECONDS_IN_MONTH].autoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(0.0239, data.stakingFlowApyPreview[6 * SECONDS_IN_MONTH].autoStake.dissolving),
      ).toBe(true);
      expect(
        checkNumber(0.0263, data.stakingFlowApyPreview[6 * SECONDS_IN_MONTH].nonAutoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(
          0.0237,
          data.stakingFlowApyPreview[6 * SECONDS_IN_MONTH].nonAutoStake.dissolving,
        ),
      ).toBe(true);

      expect(
        checkNumber(0.0357, data.stakingFlowApyPreview[SECONDS_IN_YEAR].autoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(0.027, data.stakingFlowApyPreview[SECONDS_IN_YEAR].autoStake.dissolving),
      ).toBe(true);
      expect(
        checkNumber(0.0351, data.stakingFlowApyPreview[SECONDS_IN_YEAR].nonAutoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(0.0266, data.stakingFlowApyPreview[SECONDS_IN_YEAR].nonAutoStake.dissolving),
      ).toBe(true);

      expect(
        checkNumber(0.0727, data.stakingFlowApyPreview[SECONDS_IN_TWO_YEARS].autoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(0.0505, data.stakingFlowApyPreview[SECONDS_IN_TWO_YEARS].autoStake.dissolving),
      ).toBe(true);
      expect(
        checkNumber(0.0702, data.stakingFlowApyPreview[SECONDS_IN_TWO_YEARS].nonAutoStake.locked),
      ).toBe(true);
      expect(
        checkNumber(
          0.0493,
          data.stakingFlowApyPreview[SECONDS_IN_TWO_YEARS].nonAutoStake.dissolving,
        ),
      ).toBe(true);
    }
  });

  it('calculates the reward estimates in maturity', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0093, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.0653, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.2804, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.8541, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(1.719, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(3.4956, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0187, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.1307, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.5609, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(1.7081, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(3.438, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(6.9913, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.028, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.196, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.8413, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(2.5622, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(5.1569, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(10.4869, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons.pop();
    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(15_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(2.799, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(19.6007, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(84.128, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(256.2216, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(515.6927, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(1048.6891, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0),
      ).toBe(true);
    }

    params.neurons[0].fullNeuron!.autoStakeMaturity = false;
    params.neurons[0].state = NeuronState.Dissolving;
    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_TWO_YEARS,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(2.799, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(19.4729, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(81.5107, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(232.3581, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(424.2073, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(714.1348, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0),
      ).toBe(true);
    }

    params.neurons.pop();
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0).toBe(0);
      expect(data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0).toBe(0);
      expect(data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0).toBe(0);
      expect(data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0).toBe(0);
      expect(data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0).toBe(0);
      expect(data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0).toBe(0);
    }
  });

  it('calculates the APY in the different configurations', () => {
    // Base case: 1 neuron, no fees, no staked maturity, auto stake maturity on, dissolve delay 2 years, locked.
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0727, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    // Fees don't affect the APY % ratio (only the absolute value of the rewards).
    params.neurons[0].fullNeuron!.neuronFees = BigInt(25 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0727, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    // Unless the total stake is depleted by the fees.
    params.neurons[0].fullNeuron!.neuronFees = BigInt(50 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0, data.apy.cur)).toBe(true);
      expect(checkNumber(0, data.apy.max)).toBe(true);
    }

    // Staked maturity is not affected by the fees
    params.neurons[0].fullNeuron!.neuronFees = BigInt(200 * E8S);
    params.neurons[0].fullNeuron!.stakedMaturityE8sEquivalent = BigInt(50 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0727, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons[0].fullNeuron!.autoStakeMaturity = false;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0702, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0702, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons[0].state = NeuronState.Dissolving;
    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_TWO_YEARS,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0493, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0493, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_YEAR,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0266, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0266, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + 7 * SECONDS_IN_DAY,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(2);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0363, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(3);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0485, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons[2].fullNeuron!.cachedNeuronStake = BigInt(1_000_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(3);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0727, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons[2].state = NeuronState.Dissolving;
    params.neurons[2].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_MONTH,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(3);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0227, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0227, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }

    params.neurons.pop();
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(2);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0727, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0363, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0727, data.apy.max)).toBe(true);
    }
  });
});
