import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  E8S,
  SECONDS_IN_DAY,
  SECONDS_IN_MONTH,
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
      expect(checkNumber(0.0237, data.stakingFlowApyPreview[1].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0011, data.stakingFlowApyPreview[1].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0234, data.stakingFlowApyPreview[1].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0011, data.stakingFlowApyPreview[1].nonAutoStake.dissolving)).toBe(true);

      expect(checkNumber(0.0244, data.stakingFlowApyPreview[3].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0051, data.stakingFlowApyPreview[3].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0241, data.stakingFlowApyPreview[3].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0051, data.stakingFlowApyPreview[3].nonAutoStake.dissolving)).toBe(true);

      expect(checkNumber(0.0266, data.stakingFlowApyPreview[6].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0113, data.stakingFlowApyPreview[6].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0263, data.stakingFlowApyPreview[6].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0112, data.stakingFlowApyPreview[6].nonAutoStake.dissolving)).toBe(true);

      expect(checkNumber(0.0356, data.stakingFlowApyPreview[12].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0261, data.stakingFlowApyPreview[12].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.035, data.stakingFlowApyPreview[12].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0258, data.stakingFlowApyPreview[12].nonAutoStake.dissolving)).toBe(
        true,
      );

      expect(checkNumber(0.0725, data.stakingFlowApyPreview[24].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0506, data.stakingFlowApyPreview[24].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.07, data.stakingFlowApyPreview[24].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0494, data.stakingFlowApyPreview[24].nonAutoStake.dissolving)).toBe(
        true,
      );
    }
  });

  it('calculates the reward estimates in maturity', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0097, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.0682, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.2927, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.8906, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(1.7898, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(3.6273, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0195, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.1364, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.5854, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(1.7812, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(3.5796, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(7.2546, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0292, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.2047, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.8781, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(2.6718, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(5.3693, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(10.8819, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons.pop();
    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(15_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(2.9227, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(20.4651, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(87.8078, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(267.1768, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(536.9339, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(1088.19, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
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
      expect(checkNumber(2.9227, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(20.3311, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(85.0665, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(242.22, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(441.4791, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(740.8458, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0),
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0725, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Fees don't affect the APY % ratio (only the absolute value of the rewards).
    params.neurons[0].fullNeuron!.neuronFees = BigInt(25 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0725, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0725, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: auto stake maturity off.
    params.neurons[0].fullNeuron!.autoStakeMaturity = false;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.07, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.07, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: dissolving neuron with 2 years remaining.
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
        checkNumber(0.0494, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0494, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: dissolve delay to 1 year.
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
        checkNumber(0.0258, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0258, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: dissolve delay to 1 week (below 2-week minimum).
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: add a second neuron.
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0363, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: add a third neuron.
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0483, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: the third neuron has a much bigger stake and overshadows the other two (weighting factor is applied).
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0725, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: the third neuron dissolving with 1 month (above 2-week min, but low bonus).
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0011, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0011, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }

    // Change: remove the third neuron.
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
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.0725, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0363, data.apy.cur)).toBe(true);
      expect(checkNumber(0.0725, data.apy.max)).toBe(true);
    }
  });
});
