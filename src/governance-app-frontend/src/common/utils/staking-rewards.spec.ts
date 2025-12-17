import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  E8S,
  SECONDS_IN_EIGHT_YEARS,
  SECONDS_IN_FOUR_YEARS,
  SECONDS_IN_MONTH,
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
      expect(checkNumber(0.0709, data.stakingFlowApyPreview[6].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0002, data.stakingFlowApyPreview[6].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0685, data.stakingFlowApyPreview[6].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0002, data.stakingFlowApyPreview[6].nonAutoStake.dissolving)).toBe(true);

      expect(checkNumber(0.0752, data.stakingFlowApyPreview[12].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0357, data.stakingFlowApyPreview[12].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0725, data.stakingFlowApyPreview[12].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0351, data.stakingFlowApyPreview[12].nonAutoStake.dissolving)).toBe(
        true,
      );

      expect(checkNumber(0.0839, data.stakingFlowApyPreview[24].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0772, data.stakingFlowApyPreview[24].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0806, data.stakingFlowApyPreview[24].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.0743, data.stakingFlowApyPreview[24].nonAutoStake.dissolving)).toBe(
        true,
      );

      expect(checkNumber(0.1015, data.stakingFlowApyPreview[48].autoStake.locked)).toBe(true);
      expect(checkNumber(0.0941, data.stakingFlowApyPreview[48].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.0967, data.stakingFlowApyPreview[48].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.09, data.stakingFlowApyPreview[48].nonAutoStake.dissolving)).toBe(true);

      expect(checkNumber(0.1376, data.stakingFlowApyPreview[96].autoStake.locked)).toBe(true);
      expect(checkNumber(0.1289, data.stakingFlowApyPreview[96].autoStake.dissolving)).toBe(true);
      expect(checkNumber(0.1289, data.stakingFlowApyPreview[96].nonAutoStake.locked)).toBe(true);
      expect(checkNumber(0.1213, data.stakingFlowApyPreview[96].nonAutoStake.dissolving)).toBe(
        true,
      );
    }
  });

  it('calculates the reward estimates in maturity', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0179, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.1256, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.5401, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(1.6515, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(3.3437, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(6.8792, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0359, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.2513, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(1.0801, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(3.3029, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(6.6874, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(13.7584, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(0.0538, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(0.3769, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(1.6202, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(4.9544, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(10.0312, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(20.6376, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons.pop();
    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(15_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(5.38, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(37.69, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(162.02, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(495.44, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(1003.12, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(2063.76, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
    }

    params.neurons[0].fullNeuron!.autoStakeMaturity = false;
    params.neurons[0].state = NeuronState.Dissolving;
    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_FOUR_YEARS,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(checkNumber(4.04, data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(28.2, data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0)).toBe(
        true,
      );
      expect(checkNumber(120.19, data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(359.16, data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0),
      ).toBe(true);
      expect(
        checkNumber(702.68, data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0),
      ).toBe(true);
      expect(checkNumber(1349.75, data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0)).toBe(
        true,
      );
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
    // Base case: 1 neuron, no fees, no staked maturity, auto stake maturity on, dissolve delay 8 years, locked.
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.1376, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }

    // Fees don't affect the APY % ratio (only the absolute value of the rewards).
    params.neurons[0].fullNeuron!.neuronFees = BigInt(25 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.1376, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.1376, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }

    // Change: auto stake maturity off.
    params.neurons[0].fullNeuron!.autoStakeMaturity = false;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.1289, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.1289, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }

    // Change: dissolving neuron.
    params.neurons[0].state = NeuronState.Dissolving;
    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_EIGHT_YEARS,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.1213, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.1213, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }

    // Change: dissolve delay to 4 years.
    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + SECONDS_IN_FOUR_YEARS,
      ),
    };
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        checkNumber(0.09, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.09, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
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
        checkNumber(0.0351, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0351, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }

    // Change: dissolve delay to 3 months.
    params.neurons[0].fullNeuron!.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(
        stakingRewardsTestReferenceDate.getTime() / 1000 + 3 * SECONDS_IN_MONTH,
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0688, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0917, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.1376, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }

    // Change: the third neuron has a much bigger stake and overshadows the other two (weighting factor is applied).
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0)).toBe(
        true,
      );
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
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
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0),
      ).toBe(true);
      expect(
        checkNumber(0.1376, data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0),
      ).toBe(true);
      expect(checkNumber(0.0688, data.apy.cur)).toBe(true);
      expect(checkNumber(0.1376, data.apy.max)).toBe(true);
    }
  });
});
