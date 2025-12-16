import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  E8S,
  SECONDS_IN_EIGHT_YEARS,
  SECONDS_IN_FOUR_YEARS,
  SECONDS_IN_MONTH,
  SECONDS_IN_YEAR,
} from '@constants/extra';
import { roundToDecimals } from '@utils/rounding';
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
  stakingRewardsTestReferenceDate,
} from '@utils/staking-rewards-test';

import { getNeuronId } from './neuron';

describe('staking-rewards', () => {
  let params: StakingRewardCalcParams;

  beforeEach(() => {
    // Reset params before each test to ensure a clean state
    params = getStakingRewardsInitialMockedParams() as unknown as StakingRewardCalcParams;
  });

  it('Loading state if parameters are still undefined', () => {
    // @ts-expect-error - we want to test the loading case
    params.totalVotingPower = undefined;
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(true);
    expect(isStakingRewardDataError(data)).toBe(false);
    expect(isStakingRewardDataReady(data)).toBe(false);
  });

  it('Error state if the user is not authenticated', () => {
    params.isAuthenticated = false;
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(false);
    expect(isStakingRewardDataError(data)).toBe(true);
    expect(isStakingRewardDataReady(data)).toBe(false);
  });

  it('Error state if parameters are missing (totalSupplyIcp)', () => {
    // @ts-expect-error - we want to test the error case
    params.governanceMetrics = { totalSupplyIcp: undefined };
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(false);
    expect(isStakingRewardDataError(data)).toBe(true);
    expect(isStakingRewardDataReady(data)).toBe(false);
  });

  it('Works with an empty account', () => {
    params.neurons = [];
    params.balance = 0;
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);

    expect(isStakingRewardDataLoading(data)).toBe(false);
    expect(isStakingRewardDataError(data)).toBe(false);
    expect(isStakingRewardDataReady(data)).toBe(true);

    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0);
      expect(roundToDecimals(data.rewardBalance, 2)).toBe(0);

      (Object.values(MaturityEstimatePeriod) as MaturityEstimatePeriod[]).forEach((period) => {
        expect(roundToDecimals(data.rewardEstimates.get(period) ?? 0, 2)).toBe(0);
      });

      expect(roundToDecimals(data.apy.cur, 2)).toBe(0);
      expect(roundToDecimals(data.apy.max, 2)).toBe(0);
      expect(data.apy.neurons.size).toBe(0);
    }
  });

  it('Calculates the staking ratio', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0.33);
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0.5);
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(0);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0);
    }

    params.balance = 0;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0);
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(1);
    }

    params.balance = 50;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0.67);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0.75);
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(0.8);
    }

    params.neurons.at(-1)!.fullNeuron!.cachedNeuronStake = BigInt(1_000_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingRatio, 2)).toBe(1);
    }
  });

  it('Calculates the reward balance', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.rewardBalance, 2)).toBe(0);
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

  it('Calculates the staking flow APY preview', () => {
    const data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.stakingFlowApyPreview[6].autoStake.locked, 4)).toBe(0.0709);
      expect(roundToDecimals(data.stakingFlowApyPreview[6].autoStake.dissolving, 4)).toBe(0.0002);
      expect(roundToDecimals(data.stakingFlowApyPreview[6].nonAutoStake.locked, 4)).toBe(0.0685);
      expect(roundToDecimals(data.stakingFlowApyPreview[6].nonAutoStake.dissolving, 4)).toBe(
        0.0002,
      );

      expect(roundToDecimals(data.stakingFlowApyPreview[12].autoStake.locked, 4)).toBe(0.0752);
      expect(roundToDecimals(data.stakingFlowApyPreview[12].autoStake.dissolving, 4)).toBe(0.0357);
      expect(roundToDecimals(data.stakingFlowApyPreview[12].nonAutoStake.locked, 4)).toBe(0.0725);
      expect(roundToDecimals(data.stakingFlowApyPreview[12].nonAutoStake.dissolving, 4)).toBe(
        0.0351,
      );

      expect(roundToDecimals(data.stakingFlowApyPreview[24].autoStake.locked, 4)).toBe(0.0839);
      expect(roundToDecimals(data.stakingFlowApyPreview[24].autoStake.dissolving, 4)).toBe(0.0772);
      expect(roundToDecimals(data.stakingFlowApyPreview[24].nonAutoStake.locked, 4)).toBe(0.0806);
      expect(roundToDecimals(data.stakingFlowApyPreview[24].nonAutoStake.dissolving, 4)).toBe(
        0.0743,
      );

      expect(roundToDecimals(data.stakingFlowApyPreview[48].autoStake.locked, 4)).toBe(0.1015);
      expect(roundToDecimals(data.stakingFlowApyPreview[48].autoStake.dissolving, 4)).toBe(0.0941);
      expect(roundToDecimals(data.stakingFlowApyPreview[48].nonAutoStake.locked, 4)).toBe(0.0967);
      expect(roundToDecimals(data.stakingFlowApyPreview[48].nonAutoStake.dissolving, 4)).toBe(0.09);

      expect(roundToDecimals(data.stakingFlowApyPreview[96].autoStake.locked, 4)).toBe(0.1376);
      expect(roundToDecimals(data.stakingFlowApyPreview[96].autoStake.dissolving, 4)).toBe(0.1289);
      expect(roundToDecimals(data.stakingFlowApyPreview[96].nonAutoStake.locked, 4)).toBe(0.1289);
      expect(roundToDecimals(data.stakingFlowApyPreview[96].nonAutoStake.dissolving, 4)).toBe(
        0.1213,
      );
    }
  });

  it('Calculates the reward estimates in maturity', () => {
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0, 2)).toBe(
        0.02,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0, 2)).toBe(
        0.13,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0, 2)).toBe(
        0.54,
      );
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0, 2),
      ).toBe(1.65);
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0, 2),
      ).toBe(3.34);
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0, 2)).toBe(
        6.88,
      );
    }

    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(100 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0, 2)).toBe(
        0.04,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0, 2)).toBe(
        0.25,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0, 2)).toBe(
        1.08,
      );
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0, 2),
      ).toBe(3.3);
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0, 2),
      ).toBe(6.69);
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0, 2)).toBe(
        13.76,
      );
    }

    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0, 2)).toBe(
        0.05,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0, 2)).toBe(
        0.38,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0, 2)).toBe(
        1.62,
      );
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0, 2),
      ).toBe(4.95);
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0, 2),
      ).toBe(10.03);
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0, 2)).toBe(
        20.64,
      );
    }

    params.neurons.pop();
    params.neurons[0].fullNeuron!.cachedNeuronStake = BigInt(15_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0, 2)).toBe(
        5.38,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0, 2)).toBe(
        37.69,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0, 2)).toBe(
        162.02,
      );
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0, 2),
      ).toBe(495.44);
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0, 2),
      ).toBe(1003.12);
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0, 2)).toBe(
        2063.76,
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
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.DAY) ?? 0, 2)).toBe(
        4.04,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.WEEK) ?? 0, 2)).toBe(
        28.2,
      );
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.MONTH) ?? 0, 2)).toBe(
        120.19,
      );
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.THREE_MONTHS) ?? 0, 2),
      ).toBe(359.16);
      expect(
        roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.SIX_MONTHS) ?? 0, 2),
      ).toBe(702.68);
      expect(roundToDecimals(data.rewardEstimates.get(MaturityEstimatePeriod.YEAR) ?? 0, 2)).toBe(
        1349.75,
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

  it('Calculates the APY in the different configurations', () => {
    // Base case: 1 neuron, no fees, no staked maturity, auto stake maturity on, dissolve delay 8 years, locked.
    let data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.1376);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Fees don't affect the APY % ratio (only the absolute value of the rewards).
    params.neurons[0].fullNeuron!.neuronFees = BigInt(25 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.1376);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Unless the total stake is depleted by the fees.
    params.neurons[0].fullNeuron!.neuronFees = BigInt(50 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0);
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
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.1376);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Change: auto stake maturity off.
    params.neurons[0].fullNeuron!.autoStakeMaturity = false;
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(1);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.1289);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.1289);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
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
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.1213);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.1213);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
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
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.09);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.09);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
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
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.0351);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.0351);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
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
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0.0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.0);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Change: add a second neuron.
    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(2);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.0688);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Change: add a third neuron.
    params.neurons.push(getStakingRewardsTestNeuron() as NeuronInfo);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(3);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.0917);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Change: the third neuron has a much bigger stake and overshadows the other two (weighting factor is applied).
    params.neurons[2].fullNeuron!.cachedNeuronStake = BigInt(1_000_000 * E8S);
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(3);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.1376);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
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
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[2]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[2]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }

    // Change: remove the third neuron.
    params.neurons.pop();
    data = getStakingRewardData(params, stakingRewardsTestReferenceDate);
    expect(isStakingRewardDataReady(data)).toBe(true);
    if (isStakingRewardDataReady(data)) {
      expect(data.apy.error).toBe(undefined);
      expect(data.apy.neurons.size).toBe(2);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.cur ?? 0, 4),
      ).toBe(0);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[0]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.cur ?? 0, 4),
      ).toBe(0.1376);
      expect(
        roundToDecimals(data.apy.neurons.get(getNeuronId(params.neurons[1]))?.max ?? 0, 4),
      ).toBe(0.1376);
      expect(roundToDecimals(data.apy.cur, 4)).toBe(0.0688);
      expect(roundToDecimals(data.apy.max, 4)).toBe(0.1376);
    }
  });
});
