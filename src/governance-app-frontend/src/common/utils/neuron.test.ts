import type { MaturityDisbursement, Neuron, NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';

import { isNullish } from '@dfinity/utils';
import {
  getNeuronMaturityDisbursementsInProgressE8s,
  hasValueAboveTransactionFee,
  isNonEmptyNeuron,
} from './neuron';

const mockFullNeuron = (overrides: Partial<Neuron> = {}): Neuron => ({
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
  ...overrides,
});

const mockDisbursement = (overrides: Partial<MaturityDisbursement> = {}): MaturityDisbursement => ({
  timestampOfDisbursementSeconds: undefined,
  amountE8s: 0n,
  accountToDisburseTo: undefined,
  accountIdentifierToDisburseTo: undefined,
  finalizeDisbursementTimestampSeconds: undefined,
  ...overrides,
});

const mockNeuron = (
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
    ageSeconds: 0n,
    visibility: undefined,
    fullNeuron:
      isNullish(fullNeuron) && 'fullNeuron' in overrides ? undefined : mockFullNeuron(fullNeuron),
    ...rest,
  };
};

describe('getNeuronMaturityDisbursementsInProgressE8s', () => {
  it('returns 0 when fullNeuron is undefined', () => {
    const neuron = mockNeuron({ fullNeuron: undefined });
    expect(getNeuronMaturityDisbursementsInProgressE8s(neuron)).toBe(0n);
  });

  it('returns 0 when no disbursements exist', () => {
    const neuron = mockNeuron();
    expect(getNeuronMaturityDisbursementsInProgressE8s(neuron)).toBe(0n);
  });

  it('returns 0 when disbursements array is empty', () => {
    const neuron = mockNeuron({
      fullNeuron: { maturityDisbursementsInProgress: [] },
    });
    expect(getNeuronMaturityDisbursementsInProgressE8s(neuron)).toBe(0n);
  });

  it('sums multiple disbursement amounts', () => {
    const neuron = mockNeuron({
      fullNeuron: {
        maturityDisbursementsInProgress: [
          mockDisbursement({ amountE8s: 100_000n }),
          mockDisbursement({ amountE8s: 200_000n }),
        ],
      },
    });
    expect(getNeuronMaturityDisbursementsInProgressE8s(neuron)).toBe(300_000n);
  });

  it('treats undefined amountE8s as 0', () => {
    const neuron = mockNeuron({
      fullNeuron: {
        maturityDisbursementsInProgress: [
          mockDisbursement({ amountE8s: 100_000n }),
          mockDisbursement({ amountE8s: undefined }),
        ],
      },
    });
    expect(getNeuronMaturityDisbursementsInProgressE8s(neuron)).toBe(100_000n);
  });
});

describe('hasValueAboveTransactionFee', () => {
  it('returns false when fullNeuron is undefined', () => {
    const neuron = mockNeuron({ fullNeuron: undefined });
    expect(hasValueAboveTransactionFee(neuron)).toBe(false);
  });

  it('returns false when stake + maturity equals the fee', () => {
    const neuron = mockNeuron({
      fullNeuron: { cachedNeuronStake: ICP_TRANSACTION_FEE_E8Sn },
    });
    expect(hasValueAboveTransactionFee(neuron)).toBe(false);
  });

  it('returns true when stake alone exceeds the fee', () => {
    const neuron = mockNeuron({
      fullNeuron: { cachedNeuronStake: ICP_TRANSACTION_FEE_E8Sn + 1n },
    });
    expect(hasValueAboveTransactionFee(neuron)).toBe(true);
  });

  it('returns true when maturity alone exceeds the fee', () => {
    const neuron = mockNeuron({
      fullNeuron: { maturityE8sEquivalent: ICP_TRANSACTION_FEE_E8Sn + 1n },
    });
    expect(hasValueAboveTransactionFee(neuron)).toBe(true);
  });

  it('returns true when stake + staked maturity combined exceed the fee', () => {
    const half = ICP_TRANSACTION_FEE_E8Sn / 2n + 1n;
    const neuron = mockNeuron({
      fullNeuron: {
        cachedNeuronStake: half,
        stakedMaturityE8sEquivalent: half,
      },
    });
    expect(hasValueAboveTransactionFee(neuron)).toBe(true);
  });
});

describe('isNonEmptyNeuron', () => {
  it('returns false for a neuron with no stake, no maturity, no disbursements', () => {
    const neuron = mockNeuron();
    expect(isNonEmptyNeuron(neuron)).toBe(false);
  });

  it('returns true when neuron has valid stake', () => {
    const neuron = mockNeuron({
      fullNeuron: { cachedNeuronStake: ICP_TRANSACTION_FEE_E8Sn + 1n },
    });
    expect(isNonEmptyNeuron(neuron)).toBe(true);
  });

  it('returns true when neuron has zero stake but disbursements in progress', () => {
    const neuron = mockNeuron({
      fullNeuron: {
        cachedNeuronStake: 0n,
        maturityDisbursementsInProgress: [mockDisbursement({ amountE8s: 1n })],
      },
    });
    expect(isNonEmptyNeuron(neuron)).toBe(true);
  });
});
