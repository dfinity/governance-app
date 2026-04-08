import {
  type GovernanceCachedMetrics,
  type NetworkEconomics,
  type NeuronInfo,
  NeuronState,
} from '@icp-sdk/canisters/nns';

import { E8S, SECONDS_IN_TWO_WEEKS, SECONDS_IN_TWO_YEARS } from '@constants/extra';

export type StakingRewardTestParams = {
  isAuthenticated: boolean;
  totalVotingPower: bigint;
  balance: number;
  neurons: Array<
    Pick<NeuronInfo, 'neuronId' | 'state' | 'dissolveDelaySeconds'> & {
      fullNeuron: Pick<
        NonNullable<NeuronInfo['fullNeuron']>,
        | 'maturityE8sEquivalent'
        | 'stakedMaturityE8sEquivalent'
        | 'cachedNeuronStake'
        | 'neuronFees'
        | 'agingSinceTimestampSeconds'
        | 'dissolveState'
        | 'autoStakeMaturity'
      >;
    }
  >;
  economics: Pick<NetworkEconomics, 'neuronMinimumStake'> & {
    votingPowerEconomics: Pick<
      NonNullable<NetworkEconomics['votingPowerEconomics']>,
      'neuronMinimumDissolveDelayToVoteSeconds'
    >;
  };
  governanceMetrics: Pick<GovernanceCachedMetrics, 'totalSupplyIcp'>;
};

export const stakingRewardsTestReferenceDate = new Date('2025-07-04T00:00:00Z'); // 4 Jul 2025
const stakingRewardsTestReferenceDateSeconds = stakingRewardsTestReferenceDate.getTime() / 1000;

let neuronCounter = 0n;
export const getStakingRewardsTestNeuron = (
  refDateSeconds: number = stakingRewardsTestReferenceDateSeconds,
): StakingRewardTestParams['neurons'][0] => ({
  neuronId: neuronCounter++,
  state: NeuronState.Locked,
  dissolveDelaySeconds: BigInt(SECONDS_IN_TWO_YEARS),
  fullNeuron: {
    maturityE8sEquivalent: BigInt(0),
    stakedMaturityE8sEquivalent: BigInt(0),
    cachedNeuronStake: BigInt(50 * E8S),
    neuronFees: BigInt(0),
    agingSinceTimestampSeconds: BigInt(refDateSeconds),
    dissolveState: {
      DissolveDelaySeconds: BigInt(SECONDS_IN_TWO_YEARS),
    },
    autoStakeMaturity: true,
  },
});

export const getStakingRewardsInitialMockedParams = (): StakingRewardTestParams => ({
  isAuthenticated: true,
  totalVotingPower: 88_150_266_299_091_680n, // Mission 70 (Jan 2026 snapshot)
  balance: 100,
  neurons: [getStakingRewardsTestNeuron()],
  economics: {
    neuronMinimumStake: BigInt(1 * E8S),
    votingPowerEconomics: {
      neuronMinimumDissolveDelayToVoteSeconds: BigInt(SECONDS_IN_TWO_WEEKS),
    },
  },
  governanceMetrics: { totalSupplyIcp: 534_809_202n },
});

export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const inConfidenceRange = (
  referenceValue: number,
  valueToCheck: number,
  range: number,
): boolean => {
  const min = referenceValue * (1 - range);
  const max = referenceValue * (1 + range);
  return valueToCheck >= min && valueToCheck <= max;
};
