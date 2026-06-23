import { describe, expect, it } from 'vitest';

import { ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import { mockDisbursement, mockNeuron } from '@fixtures/neuron';

import {
  formatRemainingTime,
  getFollowingHealth,
  getNeuronMaturityDisbursementsInProgressE8s,
  getSecondsSinceVotingPowerRefresh,
  getSecondsUntilDecayStarts,
  getSecondsUntilFollowingCleared,
  hasValueAboveTransactionFee,
  isNonEmptyNeuron,
} from './neuron';

const SECONDS_IN_MONTH = BigInt(30 * 24 * 60 * 60);
// Matches the protocol defaults from governance.proto VotingPowerEconomics:
// voting power starts to decline 6 months after the last refresh, and following
// is cleared one month later (so 7 months after the last refresh in total).
// `clearFollowingAfterSeconds` is the duration of the reduction phase, not the
// absolute deadline from refresh.
const ECONOMICS = {
  startReducingVotingPowerAfterSeconds: 6n * SECONDS_IN_MONTH,
  clearFollowingAfterSeconds: 1n * SECONDS_IN_MONTH,
};
const NOW = new Date('2026-01-01T00:00:00Z');
const NOW_SECONDS = BigInt(Math.floor(NOW.getTime() / 1000));

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

  it('returns false when stake exceeds fee but neuron fees bring it below', () => {
    const neuron = mockNeuron({
      fullNeuron: {
        cachedNeuronStake: ICP_TRANSACTION_FEE_E8Sn + 1n,
        neuronFees: ICP_TRANSACTION_FEE_E8Sn,
      },
    });
    expect(hasValueAboveTransactionFee(neuron)).toBe(false);
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

describe('getSecondsSinceVotingPowerRefresh', () => {
  it('returns undefined when no refresh timestamp is set', () => {
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: undefined });
    expect(getSecondsSinceVotingPowerRefresh(neuron, NOW)).toBeUndefined();
  });

  it('returns elapsed seconds since the refresh', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - SECONDS_IN_MONTH,
    });
    expect(getSecondsSinceVotingPowerRefresh(neuron, NOW)).toBe(SECONDS_IN_MONTH);
  });

  it('clamps to 0 when the refresh timestamp is in the future', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS + SECONDS_IN_MONTH,
    });
    expect(getSecondsSinceVotingPowerRefresh(neuron, NOW)).toBe(0n);
  });

  it('falls back to fullNeuron.votingPowerRefreshedTimestampSeconds', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: undefined,
      fullNeuron: { votingPowerRefreshedTimestampSeconds: NOW_SECONDS - SECONDS_IN_MONTH },
    });
    expect(getSecondsSinceVotingPowerRefresh(neuron, NOW)).toBe(SECONDS_IN_MONTH);
  });
});

describe('getSecondsUntilFollowingCleared', () => {
  it('returns remaining seconds before the deadline (startReducing + clearFollowing from refresh)', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 5n * SECONDS_IN_MONTH,
    });
    // Deadline is at 6mo + 1mo = 7mo after refresh; with 5mo elapsed, 2mo remain.
    expect(getSecondsUntilFollowingCleared(neuron, ECONOMICS, NOW)).toBe(2n * SECONDS_IN_MONTH);
  });

  it('returns 0 once the deadline has passed', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 8n * SECONDS_IN_MONTH,
    });
    expect(getSecondsUntilFollowingCleared(neuron, ECONOMICS, NOW)).toBe(0n);
  });

  it('returns undefined when economics are missing', () => {
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: NOW_SECONDS });
    expect(getSecondsUntilFollowingCleared(neuron, undefined, NOW)).toBeUndefined();
  });

  it('returns undefined when the refresh timestamp is missing', () => {
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: undefined });
    expect(getSecondsUntilFollowingCleared(neuron, ECONOMICS, NOW)).toBeUndefined();
  });
});

describe('formatRemainingTime', () => {
  const SECONDS_IN_DAY_BIG = BigInt(24 * 60 * 60);

  it('returns empty string for non-positive values', () => {
    expect(formatRemainingTime(0n)).toBe('');
    expect(formatRemainingTime(-1n)).toBe('');
  });

  it('rounds to a whole day when just under a day boundary (the flicker fix)', () => {
    // 9d 23h 59m 59s — would normally render as "9 days, 23 hours"
    expect(formatRemainingTime(10n * SECONDS_IN_DAY_BIG - 1n)).toBe('10 days');
  });

  it('rounds to a whole day when just over a day boundary', () => {
    // 10d 1s — would normally render as "10 days, 1 second"
    expect(formatRemainingTime(10n * SECONDS_IN_DAY_BIG + 1n)).toBe('10 days');
  });

  it('uses the nearest day when between day boundaries', () => {
    // 10d 12h — rounds up to 11 days (banker's-style ties go up here).
    expect(formatRemainingTime(10n * SECONDS_IN_DAY_BIG + 12n * 3600n)).toBe('11 days');
    // 10d 11h — rounds down to 10 days.
    expect(formatRemainingTime(10n * SECONDS_IN_DAY_BIG + 11n * 3600n)).toBe('10 days');
  });

  it('preserves precision for sub-day durations', () => {
    expect(formatRemainingTime(BigInt(3 * 60 * 60))).toBe('3 hours');
    expect(formatRemainingTime(BigInt(23 * 60 * 60 + 30 * 60))).toBe('23 hours, 30 minutes');
  });
});

describe('getSecondsUntilDecayStarts', () => {
  it('returns remaining seconds before startReducing is reached', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 5n * SECONDS_IN_MONTH,
    });
    expect(getSecondsUntilDecayStarts(neuron, ECONOMICS, NOW)).toBe(1n * SECONDS_IN_MONTH);
  });

  it('returns 0 once startReducing has been crossed', () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 7n * SECONDS_IN_MONTH,
    });
    expect(getSecondsUntilDecayStarts(neuron, ECONOMICS, NOW)).toBe(0n);
  });

  it('returns undefined when economics are missing', () => {
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: NOW_SECONDS });
    expect(getSecondsUntilDecayStarts(neuron, undefined, NOW)).toBeUndefined();
  });

  it('returns undefined when the refresh timestamp is missing', () => {
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: undefined });
    expect(getSecondsUntilDecayStarts(neuron, ECONOMICS, NOW)).toBeUndefined();
  });
});

describe('getFollowingHealth', () => {
  it("returns 'ok' well inside the safe window", () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 1n * SECONDS_IN_MONTH,
    });
    expect(getFollowingHealth(neuron, ECONOMICS, NOW)).toBe('ok');
  });

  it("returns 'warning' inside the proactive notice window before voting power starts to reduce", () => {
    // 20 days before startReducing (which is 6mo). Falls within the 30-day window.
    const refreshed = NOW_SECONDS - (6n * SECONDS_IN_MONTH - BigInt(20 * 24 * 60 * 60));
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: refreshed });
    expect(getFollowingHealth(neuron, ECONOMICS, NOW)).toBe('warning');
  });

  it("stays 'ok' just outside the proactive notice window", () => {
    // 35 days before startReducing — outside the 30-day notice window.
    const refreshed = NOW_SECONDS - (6n * SECONDS_IN_MONTH - BigInt(35 * 24 * 60 * 60));
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: refreshed });
    expect(getFollowingHealth(neuron, ECONOMICS, NOW)).toBe('ok');
  });

  it("transitions to 'decaying' the moment voting power starts to reduce", () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 6n * SECONDS_IN_MONTH,
    });
    expect(getFollowingHealth(neuron, ECONOMICS, NOW)).toBe('decaying');
  });

  it("stays 'decaying' between startReducing and the clear deadline", () => {
    // 6.5 months elapsed: past startReducing but before startReducing + clearFollowing.
    const refreshed = NOW_SECONDS - (6n * SECONDS_IN_MONTH + BigInt(15 * 24 * 60 * 60));
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: refreshed });
    expect(getFollowingHealth(neuron, ECONOMICS, NOW)).toBe('decaying');
  });

  it("returns 'expired' once following is cleared (startReducing + clearFollowing)", () => {
    const neuron = mockNeuron({
      votingPowerRefreshedTimestampSeconds: NOW_SECONDS - 7n * SECONDS_IN_MONTH,
    });
    expect(getFollowingHealth(neuron, ECONOMICS, NOW)).toBe('expired');
  });

  it('returns undefined when thresholds are missing', () => {
    const neuron = mockNeuron({ votingPowerRefreshedTimestampSeconds: NOW_SECONDS });
    expect(getFollowingHealth(neuron, undefined, NOW)).toBeUndefined();
  });
});
