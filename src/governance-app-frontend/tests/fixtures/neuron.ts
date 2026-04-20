import type { MaturityDisbursement, Neuron, NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { isNullish } from '@dfinity/utils';

export const mockFullNeuron = (overrides: Partial<Neuron> = {}): Neuron => ({
  id: 1n,
  neuronType: undefined,
  stakedMaturityE8sEquivalent: 0n,
  controller: undefined,
  recentBallots: [],
  kycVerified: false,
  notForProfit: false,
  cachedNeuronStake: 0n,
  createdTimestampSeconds: 0n,
  autoStakeMaturity: undefined,
  maturityE8sEquivalent: 0n,
  agingSinceTimestampSeconds: 0n,
  spawnAtTimesSeconds: undefined,
  neuronFees: 0n,
  hotKeys: [],
  accountIdentifier: '',
  joinedCommunityFundTimestampSeconds: undefined,
  maturityDisbursementsInProgress: undefined,
  dissolveState: undefined,
  followees: [],
  visibility: undefined,
  votingPowerRefreshedTimestampSeconds: undefined,
  potentialVotingPower: undefined,
  decidingVotingPower: undefined,
  eightYearGangBonusBaseE8s: undefined,
  ...overrides,
});

export const mockNeuron = (
  overrides: Partial<Omit<NeuronInfo, 'fullNeuron'>> & {
    fullNeuron?: Partial<Neuron> | undefined;
  } = {},
): NeuronInfo => {
  const { fullNeuron, ...rest } = overrides;
  return {
    neuronId: 1n,
    state: NeuronState.Locked,
    dissolveDelaySeconds: 0n,
    createdTimestampSeconds: 0n,
    recentBallots: [],
    neuronType: undefined,
    joinedCommunityFundTimestampSeconds: undefined,
    retrievedAtTimestampSeconds: 0n,
    votingPower: 0n,
    votingPowerRefreshedTimestampSeconds: undefined,
    decidingVotingPower: undefined,
    potentialVotingPower: undefined,
    eightYearGangBonusBaseE8s: undefined,
    ageSeconds: 0n,
    visibility: undefined,
    fullNeuron:
      'fullNeuron' in overrides && isNullish(fullNeuron)
        ? undefined
        : mockFullNeuron(fullNeuron ?? {}),
    ...rest,
  };
};

export const mockDisbursement = (
  overrides: Partial<MaturityDisbursement> = {},
): MaturityDisbursement => ({
  timestampOfDisbursementSeconds: undefined,
  amountE8s: 0n,
  accountToDisburseTo: undefined,
  accountIdentifierToDisburseTo: undefined,
  finalizeDisbursementTimestampSeconds: undefined,
  ...overrides,
});
