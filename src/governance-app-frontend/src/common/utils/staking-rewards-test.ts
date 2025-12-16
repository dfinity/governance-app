import {
  type GovernanceCachedMetrics,
  type NetworkEconomics,
  type NeuronInfo,
  NeuronState,
} from '@icp-sdk/canisters/nns';

import { E8S, SECONDS_IN_EIGHT_YEARS, SECONDS_IN_HALF_YEAR } from '@constants/extra';

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
  dissolveDelaySeconds: BigInt(SECONDS_IN_EIGHT_YEARS),
  fullNeuron: {
    maturityE8sEquivalent: BigInt(0),
    stakedMaturityE8sEquivalent: BigInt(0),
    cachedNeuronStake: BigInt(50 * E8S),
    neuronFees: BigInt(0),
    agingSinceTimestampSeconds: BigInt(refDateSeconds),
    dissolveState: {
      DissolveDelaySeconds: BigInt(SECONDS_IN_EIGHT_YEARS),
    },
    autoStakeMaturity: true,
  },
});

export const getStakingRewardsInitialMockedParams = (): StakingRewardTestParams => ({
  isAuthenticated: true,
  totalVotingPower: 50_276_005_084_190_970n, // 24 Jun 2025
  balance: 100,
  neurons: [getStakingRewardsTestNeuron()],
  economics: {
    neuronMinimumStake: BigInt(1 * E8S),
    votingPowerEconomics: {
      neuronMinimumDissolveDelayToVoteSeconds: BigInt(SECONDS_IN_HALF_YEAR),
    },
  },
  governanceMetrics: { totalSupplyIcp: 534_809_202n }, // 24 Jun 2025
});
