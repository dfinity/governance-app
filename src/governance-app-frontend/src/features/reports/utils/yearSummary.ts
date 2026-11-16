import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { getNeuronFreeMaturityE8s, getNeuronStakedMaturityE8s } from '@utils/neuron';

import type { EntityHistory } from './loadReportData';
import { type ReportRate, type ReportRateLookup, toFiatHundredths } from './rates';
import {
  type ReportEntity,
  type ReportTransaction,
  ReportTransactionType,
} from './transactionsCsv';

/** The daily rate history of the backend starts on 1 January 2025. */
export const FIRST_SUMMARY_YEAR = 2025;

export type YearPeriod = {
  year: number;
  /** 1 January at 00:00 UTC. */
  fromMs: number;
  /** 1 January of the next year at 00:00 UTC, or now for the current year. Not included. */
  toMs: number;
  isCurrentYear: boolean;
};

export const getYearPeriod = (year: number, nowMs: number): YearPeriod => {
  const nextYearMs = Date.UTC(year + 1, 0, 1);

  return {
    year,
    fromMs: Date.UTC(year, 0, 1),
    toMs: Math.min(nextYearMs, nowMs),
    isCurrentYear: nowMs < nextYearMs,
  };
};

/** The years that a summary can cover, the current year first. */
export const getSummaryYears = (nowMs: number): number[] => {
  const currentYear = new Date(nowMs).getUTCFullYear();

  return Array.from(
    { length: Math.max(currentYear - FIRST_SUMMARY_YEAR + 1, 1) },
    (_, index) => currentYear - index,
  );
};

export type RewardRow = {
  entity: ReportEntity;
  transaction: ReportTransaction;
  rate: ReportRate | undefined;
  /** `undefined` without a rate. */
  valueHundredths: bigint | undefined;
};

export type HoldingRow = {
  entity: ReportEntity;
  balanceE8s: bigint;
};

export type YearSummary = {
  period: YearPeriod;
  /** Each mint to an account or a neuron account of the user, newest first. */
  rewards: RewardRow[];
  rewardsTotalE8s: bigint;
  /** The total of the rewards that have a rate. */
  rewardsTotalHundredths: bigint;
  rewardsWithoutRate: number;
  /** The balance of each entity at the end of the period. Entities with no ICP are left out. */
  holdings: HoldingRow[];
  holdingsTotalE8s: bigint;
  holdingsRate: ReportRate | undefined;
  holdingsTotalHundredths: bigint | undefined;
  /** The maturity of the neurons today. `undefined` for a past year, because no history exists. */
  maturityE8s: bigint | undefined;
  /** The ICP from accounts that are not the user's. Rewards do not count. */
  receivedE8s: bigint;
  /** The ICP to accounts that are not the user's, burns included. */
  sentE8s: bigint;
  feesE8s: bigint;
  /** `false` if an account had too many transactions to load them all. */
  complete: boolean;
};

const sum = (values: bigint[]): bigint => values.reduce((total, value) => total + value, 0n);

/** The change of the entity balance: the amount, minus the fee that the entity paid. */
const getBalanceChangeE8s = ({ amountE8s, feeE8s }: ReportTransaction): bigint =>
  amountE8s - (feeE8s ?? 0n);

const isInPeriod = ({ timestampMs }: ReportTransaction, { fromMs, toMs }: YearPeriod): boolean =>
  timestampMs !== undefined && timestampMs >= fromMs && timestampMs < toMs;

const byNewestFirst = (a: RewardRow, b: RewardRow): number =>
  (b.transaction.timestampMs ?? 0) - (a.transaction.timestampMs ?? 0) ||
  Number(b.transaction.id - a.transaction.id);

/**
 * The summary of a year. The balance at the end of a past year is the current balance minus the
 * changes after that year, so the histories must reach from now back to the start of the year.
 */
export const buildYearSummary = ({
  period,
  histories,
  complete,
  neurons,
  rateLookup,
}: {
  period: YearPeriod;
  histories: EntityHistory[];
  complete: boolean;
  neurons: NeuronInfo[];
  rateLookup: ReportRateLookup;
}): YearSummary => {
  const ownAccountIds = new Set(histories.map(({ entity }) => entity.accountId));
  const periodRows = histories.flatMap(({ entity, transactions }) =>
    transactions
      .filter((transaction) => isInPeriod(transaction, period))
      .map((transaction) => ({ entity, transaction })),
  );

  const rewards = periodRows
    .filter(({ transaction }) => transaction.type === ReportTransactionType.Reward)
    .map(({ entity, transaction }): RewardRow => {
      const rate = rateLookup(transaction.timestampMs!);
      return {
        entity,
        transaction,
        rate,
        valueHundredths:
          rate === undefined
            ? undefined
            : toFiatHundredths({
                amountE8s: transaction.amountE8s,
                icpToFiatE8s: rate.icpToFiatE8s,
              }),
      };
    })
    .toSorted(byNewestFirst);

  const holdings = histories
    .map(({ entity, balanceE8s, transactions }): HoldingRow => {
      const laterChangesE8s = sum(
        transactions
          .filter(({ timestampMs }) => timestampMs !== undefined && timestampMs >= period.toMs)
          .map(getBalanceChangeE8s),
      );
      return { entity, balanceE8s: balanceE8s - laterChangesE8s };
    })
    .filter(({ balanceE8s }) => balanceE8s !== 0n);
  const holdingsTotalE8s = sum(holdings.map(({ balanceE8s }) => balanceE8s));
  const holdingsRate = rateLookup(period.toMs - 1);

  const nonRewardRows = periodRows.filter(
    ({ transaction }) => transaction.type !== ReportTransactionType.Reward,
  );

  return {
    period,
    rewards,
    rewardsTotalE8s: sum(rewards.map(({ transaction }) => transaction.amountE8s)),
    rewardsTotalHundredths: sum(rewards.flatMap(({ valueHundredths: v }) => v ?? [])),
    rewardsWithoutRate: rewards.filter(({ rate }) => rate === undefined).length,
    holdings,
    holdingsTotalE8s,
    holdingsRate,
    holdingsTotalHundredths:
      holdingsRate === undefined
        ? undefined
        : toFiatHundredths({
            amountE8s: holdingsTotalE8s,
            icpToFiatE8s: holdingsRate.icpToFiatE8s,
          }),
    maturityE8s: period.isCurrentYear
      ? sum(
          neurons.map(
            (neuron) => getNeuronFreeMaturityE8s(neuron) + getNeuronStakedMaturityE8s(neuron),
          ),
        )
      : undefined,
    receivedE8s: sum(
      nonRewardRows
        .filter(
          ({ transaction }) => transaction.amountE8s > 0n && !ownAccountIds.has(transaction.from),
        )
        .map(({ transaction }) => transaction.amountE8s),
    ),
    sentE8s: sum(
      nonRewardRows
        .filter(
          ({ transaction }) => transaction.amountE8s < 0n && !ownAccountIds.has(transaction.to),
        )
        .map(({ transaction }) => -transaction.amountE8s),
    ),
    feesE8s: sum(periodRows.map(({ transaction }) => transaction.feeE8s ?? 0n)),
    complete,
  };
};
