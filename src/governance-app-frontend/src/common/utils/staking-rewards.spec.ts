import {
  type GovernanceCachedMetrics,
  type NetworkEconomics,
  type NeuronInfo,
  NeuronState,
} from '@icp-sdk/canisters/nns';
import { describe, it } from 'vitest';

import { E8S, SECONDS_IN_EIGHT_YEARS } from '@constants/extra';

type TestStakingRewardCalcParams = {
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
  economics: {
    parameters: Pick<NetworkEconomics, 'neuronMinimumStake'> & {
      votingPowerEconomics: Pick<
        NonNullable<NetworkEconomics['votingPowerEconomics']>,
        'neuronMinimumDissolveDelayToVoteSeconds'
      >;
    };
  };
  governanceMetrics: {
    metrics: Pick<GovernanceCachedMetrics, 'totalSupplyIcp'>;
  };

  nnsTotalVotingPower: bigint;
};

const referenceDate = new Date('2025-07-04T00:00:00Z'); // 4 Jul 2025
const referenceDateSeconds = referenceDate.getTime() / 1000;

let neuronCounter = 0n;
export const getApyTestNeuron = (
  refDateSeconds: number = referenceDateSeconds,
): TestStakingRewardCalcParams['neurons'][0] => ({
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

describe('staking-rewards utils', () => {
  it('TODO: should add tests for staking-rewards utility functions', () => {
    // TODO: implement unit tests
  });
});
