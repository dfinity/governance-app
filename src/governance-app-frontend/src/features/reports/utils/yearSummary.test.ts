import { describe, expect, it } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import type { EntityHistory } from './loadReportData';
import type { ReportRateLookup } from './rates';
import { approveTx, MAIN, mintTx, NEURON, OTHER, SAVINGS, transferTx } from './testUtils';
import { mapReportTransaction, type ReportEntity } from './transactionsCsv';
import { buildYearSummary, getSummaryYears, getYearPeriod } from './yearSummary';

const ICP = 100_000_000n;
const FEE = 10_000n;

const main: ReportEntity = { kind: 'account', accountId: MAIN, name: 'Main' };
const savings: ReportEntity = { kind: 'account', accountId: SAVINGS, name: 'Savings' };
const neuron: ReportEntity = { kind: 'neuron', accountId: NEURON, neuronId: 7n };
const neuronAccountIds = new Set([NEURON]);
const ownAccountIds = new Set([MAIN, SAVINGS, NEURON]);

const history = (
  entity: ReportEntity,
  balanceE8s: bigint,
  transactions: ReturnType<typeof transferTx>[],
): EntityHistory => ({
  entity,
  balanceE8s,
  transactions: transactions.map((transaction) =>
    mapReportTransaction({ entity, transaction, neuronAccountIds, ownAccountIds }),
  ),
});

const ownToSavings = transferTx({
  id: 4n,
  ms: Date.UTC(2025, 9, 1),
  from: MAIN,
  to: SAVINGS,
  e8s: 20n * ICP,
});
const stake = transferTx({
  id: 3n,
  ms: Date.UTC(2025, 5, 1),
  from: MAIN,
  to: NEURON,
  e8s: 200n * ICP,
});

const histories = [
  history(main, 1_000n * ICP, [
    transferTx({ id: 8n, ms: Date.UTC(2026, 1, 1), from: OTHER, to: MAIN, e8s: 100n * ICP }),
    mintTx({ id: 7n, ms: Date.UTC(2025, 11, 20), to: MAIN, e8s: 10n * ICP }),
    transferTx({ id: 5n, ms: Date.UTC(2025, 10, 1), from: MAIN, to: OTHER, e8s: 50n * ICP }),
    ownToSavings,
    stake,
    transferTx({ id: 2n, ms: Date.UTC(2025, 2, 1), from: OTHER, to: MAIN, e8s: 500n * ICP }),
    transferTx({ id: 1n, ms: Date.UTC(2024, 11, 31), from: OTHER, to: MAIN, e8s: 5n * ICP }),
  ]),
  history(savings, 20n * ICP, [ownToSavings]),
  history(neuron, 200n * ICP, [stake]),
];

const RATE_DAY_MS = Date.UTC(2025, 11, 31);
const twoPerIcp: ReportRateLookup = () => ({
  dayMs: RATE_DAY_MS,
  fiatDayMs: RATE_DAY_MS,
  fiatIsFinal: true,
  icpToFiatE8s: 2n * ICP,
});
const NOW = Date.UTC(2026, 2, 1);

describe('buildYearSummary', () => {
  it('sums a past year and calculates the holdings back from the current balances', () => {
    const summary = buildYearSummary({
      period: getYearPeriod(2025, NOW),
      histories,
      complete: true,
      neurons: [mockNeuron()],
      rateLookup: twoPerIcp,
    });

    expect(summary.rewards.map(({ transaction }) => transaction.id)).toEqual([7n]);
    expect(summary.rewardsTotalE8s).toBe(10n * ICP);
    expect(summary.rewardsTotalHundredths).toBe(2_000n);
    expect(summary.rewardsWithoutRate).toBe(0);

    // Main had 1,000 ICP before the 100 ICP of February 2026.
    expect(
      summary.holdings.map(({ entity, balanceE8s }) => [entity.accountId, balanceE8s]),
    ).toEqual([
      [MAIN, 900n * ICP],
      [SAVINGS, 20n * ICP],
      [NEURON, 200n * ICP],
    ]);
    expect(summary.holdingsTotalE8s).toBe(1_120n * ICP);
    expect(summary.holdingsTotalHundredths).toBe(224_000n);
    expect(summary.holdingsRate?.dayMs).toBe(RATE_DAY_MS);
    expect(summary.maturityE8s).toBeUndefined();

    // The stake and the transfer to Savings stay between the user's own accounts.
    expect(summary.receivedE8s).toBe(500n * ICP);
    expect(summary.sentE8s).toBe(50n * ICP);
    expect(summary.feesE8s).toBe(3n * FEE);
    expect(summary.complete).toBe(true);
  });

  it('adds back the amount and the fee of each later debit for a past year', () => {
    const LATER_MS = Date.UTC(2026, 1, 1);
    const approvalToMain = approveTx({ id: 13n, ms: LATER_MS, from: SAVINGS, spender: MAIN });

    const summary = buildYearSummary({
      period: getYearPeriod(2025, NOW),
      histories: [
        history(main, 1_000n * ICP, [
          transferTx({ id: 10n, ms: LATER_MS, from: MAIN, to: OTHER, e8s: 30n * ICP }),
          approveTx({ id: 11n, ms: LATER_MS, from: MAIN, spender: OTHER }),
          transferTx({ id: 12n, ms: LATER_MS, from: MAIN, to: MAIN, e8s: 5n * ICP }),
          approvalToMain,
        ]),
        history(savings, 20n * ICP, [approvalToMain]),
      ],
      complete: true,
      neurons: [],
      rateLookup: twoPerIcp,
    });

    // The outgoing transfer gives back its amount and fee. The approval and the self transfer give
    // back only the fee. The approval to Main as spender gives back the fee only to Savings.
    expect(
      summary.holdings.map(({ entity, balanceE8s }) => [entity.accountId, balanceE8s]),
    ).toEqual([
      [MAIN, 1_030n * ICP + 3n * FEE],
      [SAVINGS, 20n * ICP + FEE],
    ]);
    expect(summary.holdingsTotalE8s).toBe(1_050n * ICP + 4n * FEE);
  });

  it('gives the current balances and the maturity for the current year', () => {
    const summary = buildYearSummary({
      period: getYearPeriod(2026, NOW),
      histories,
      complete: false,
      neurons: [
        mockNeuron({
          fullNeuron: { maturityE8sEquivalent: 3n * ICP, stakedMaturityE8sEquivalent: 1n * ICP },
        }),
      ],
      rateLookup: () => undefined,
    });

    expect(summary.holdingsTotalE8s).toBe(1_220n * ICP);
    expect(summary.holdingsTotalHundredths).toBeUndefined();
    expect(summary.maturityE8s).toBe(4n * ICP);
    expect(summary.rewards).toEqual([]);
    expect(summary.receivedE8s).toBe(100n * ICP);
    expect(summary.complete).toBe(false);
  });

  it('takes the neuron fees off the current neuron balance', () => {
    const summary = buildYearSummary({
      period: getYearPeriod(2026, NOW),
      histories: [history(neuron, 10n * ICP, [])],
      complete: true,
      neurons: [mockNeuron({ neuronId: 7n, fullNeuron: { neuronFees: 1n * ICP } })],
      rateLookup: twoPerIcp,
    });

    expect(summary.holdings.map(({ balanceE8s }) => balanceE8s)).toEqual([9n * ICP]);
  });

  it('marks the summary incomplete when a transaction has no timestamp', () => {
    const [undated] = history(main, 0n, [
      mintTx({ id: 1n, ms: 0, to: MAIN, e8s: ICP }),
    ]).transactions;
    const summary = buildYearSummary({
      period: getYearPeriod(2025, NOW),
      histories: [
        {
          entity: main,
          balanceE8s: 1n * ICP,
          transactions: [{ ...undated, timestampMs: undefined }],
        },
      ],
      complete: true,
      neurons: [],
      rateLookup: twoPerIcp,
    });

    expect(summary.complete).toBe(false);
  });

  it('counts a reward without a rate, but not in the fiat total', () => {
    const summary = buildYearSummary({
      period: getYearPeriod(2025, NOW),
      histories,
      complete: true,
      neurons: [],
      rateLookup: () => undefined,
    });

    expect(summary.rewards[0].valueHundredths).toBeUndefined();
    expect(summary.rewardsTotalHundredths).toBe(0n);
    expect(summary.rewardsWithoutRate).toBe(1);
  });

  it('gives the date when the fiat value of a reward is final', () => {
    const rewardDayMs = Date.UTC(2025, 11, 20);
    const summary = buildYearSummary({
      period: getYearPeriod(2025, NOW),
      histories,
      complete: true,
      neurons: [],
      // Only the reward day has a non-final rate. The holdings rate is final.
      rateLookup: (timestampMs) => ({
        ...twoPerIcp(timestampMs)!,
        fiatDayMs: timestampMs < RATE_DAY_MS ? rewardDayMs : RATE_DAY_MS,
        fiatIsFinal: timestampMs >= RATE_DAY_MS,
      }),
    });

    expect(summary.rewards).toHaveLength(1);
    expect(summary.fiatRatesFinalAtMs).toBe(Date.UTC(2025, 11, 23));
  });

  it('gives the date when the fiat value of the holdings is final', () => {
    const nonFinalDayMs = Date.UTC(2026, 10, 14);
    const summary = buildYearSummary({
      period: getYearPeriod(2026, NOW),
      histories,
      complete: true,
      neurons: [],
      rateLookup: (timestampMs) => ({
        ...twoPerIcp(timestampMs)!,
        fiatDayMs: nonFinalDayMs,
        fiatIsFinal: false,
      }),
    });

    expect(summary.rewards).toEqual([]);
    expect(summary.fiatRatesFinalAtMs).toBe(Date.UTC(2026, 10, 17));
  });

  it('ignores the rate of zero holdings and gives no date for final rates', () => {
    const nonFinal: ReportRateLookup = (timestampMs) => ({
      ...twoPerIcp(timestampMs)!,
      fiatIsFinal: false,
    });

    expect(
      buildYearSummary({
        period: getYearPeriod(2026, NOW),
        histories: [history(main, 0n, [])],
        complete: true,
        neurons: [],
        rateLookup: nonFinal,
      }).fiatRatesFinalAtMs,
    ).toBeUndefined();
    expect(
      buildYearSummary({
        period: getYearPeriod(2026, NOW),
        histories,
        complete: true,
        neurons: [],
        rateLookup: twoPerIcp,
      }).fiatRatesFinalAtMs,
    ).toBeUndefined();
  });
});

describe('getYearPeriod', () => {
  it('ends a past year on 1 January and the current year now', () => {
    expect(getYearPeriod(2025, NOW)).toEqual({
      year: 2025,
      fromMs: Date.UTC(2025, 0, 1),
      toMs: Date.UTC(2026, 0, 1),
      isCurrentYear: false,
    });
    expect(getYearPeriod(2026, NOW)).toMatchObject({ toMs: NOW, isCurrentYear: true });
  });
});

describe('getSummaryYears', () => {
  it('lists the years from now back to 2025', () => {
    expect(getSummaryYears(Date.UTC(2027, 4, 1))).toEqual([2027, 2026, 2025]);
    expect(getSummaryYears(Date.UTC(2025, 4, 1))).toEqual([2025]);
  });
});
