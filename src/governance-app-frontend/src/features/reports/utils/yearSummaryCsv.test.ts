import { describe, expect, it } from 'vitest';

import { MAIN, mintTx } from './testUtils';
import { mapReportTransaction, type ReportEntity } from './transactionsCsv';
import { getYearPeriod, type YearSummary } from './yearSummary';
import { buildYearSummaryCsv, type YearSummaryCsvLabels } from './yearSummaryCsv';

const ICP = 100_000_000n;
const main: ReportEntity = { kind: 'account', accountId: MAIN, name: 'Main' };
const neuron: ReportEntity = { kind: 'neuron', accountId: 'neuron-account', neuronId: 7n };
const rate = {
  dayMs: Date.UTC(2025, 11, 20),
  fiatDayMs: Date.UTC(2025, 11, 20),
  icpToFiatE8s: 2n * ICP,
};

const labels: YearSummaryCsvLabels = {
  title: 'Year summary',
  period: 'Period',
  currency: 'Currency',
  total: 'Total',
  rewards: 'Rewards',
  holdings: 'Holdings on 2025-12-31',
  movements: 'Movements',
  notIncluded: 'Not included',
  incomplete: 'Some transactions are missing.',
  headers: {
    date: 'Date',
    account: 'Account',
    accountId: 'Account ID',
    neuronId: 'Neuron ID',
    amount: 'Amount',
    balance: 'Balance',
    price: 'Price',
    value: 'Value',
    rateDate: 'Rate date',
    maturity: 'Maturity',
    received: 'Received',
    sent: 'Sent',
    fees: 'Fees',
  },
  limits: ['No maturity, sorry.'],
};

const summary: YearSummary = {
  period: getYearPeriod(2025, Date.UTC(2026, 2, 1)),
  rewards: [
    {
      entity: main,
      transaction: mapReportTransaction({
        entity: main,
        transaction: mintTx({ id: 7n, ms: Date.UTC(2025, 11, 20, 9), to: MAIN, e8s: 10n * ICP }),
        neuronAccountIds: new Set(),
      }),
      rate,
      valueHundredths: 2_000n,
    },
  ],
  rewardsTotalE8s: 10n * ICP,
  rewardsTotalHundredths: 2_000n,
  rewardsWithoutRate: 0,
  holdings: [
    { entity: main, balanceE8s: 900n * ICP },
    { entity: neuron, balanceE8s: 200n * ICP },
  ],
  holdingsTotalE8s: 1_100n * ICP,
  holdingsRate: rate,
  holdingsTotalHundredths: 220_000n,
  maturityE8s: undefined,
  receivedE8s: 500n * ICP,
  sentE8s: 50n * ICP,
  feesE8s: 30_000n,
  complete: true,
};

describe('buildYearSummaryCsv', () => {
  it('writes the four parts of the summary, each after an empty line', () => {
    const csv = buildYearSummaryCsv({ summary, currency: 'EUR', labels });

    expect(csv.split('\r\n')).toEqual([
      '﻿Year summary,2025',
      'Period,2025-01-01 - 2025-12-31',
      'Currency,EUR',
      '',
      'Rewards',
      'Date,Account,Account ID,Neuron ID,Amount,Price,Value,Rate date',
      `2025-12-20 09:00:00,Main,${MAIN},,10.00000000,2.00000000,20.00,2025-12-20`,
      'Total,,,,10.00000000,,20.00,',
      '',
      'Holdings on 2025-12-31',
      'Account,Account ID,Neuron ID,Balance',
      `Main,${MAIN},,900.00000000`,
      ',neuron-account,"=""7""",200.00000000',
      'Total,,,1100.00000000',
      'Price,2.00000000',
      'Value,2200.00',
      'Rate date,2025-12-20',
      '',
      'Movements',
      'Received,500.00000000',
      'Sent,50.00000000',
      'Fees,0.00030000',
      '',
      'Not included',
      '"No maturity, sorry."',
      '',
    ]);
  });

  it('warns about missing transactions and leaves out a fiat total that misses rates', () => {
    const csv = buildYearSummaryCsv({
      summary: { ...summary, complete: false, rewardsWithoutRate: 1 },
      currency: 'EUR',
      labels,
    });

    expect(csv).toContain('\r\nTotal,,,,10.00000000,,,\r\n');
    expect(csv).toContain(
      '\r\nNot included\r\nSome transactions are missing.\r\n"No maturity, sorry."\r\n',
    );
  });

  it('adds the date of the USD/fiat rate for a currency other than USD', () => {
    const fiatRate = { ...rate, fiatDayMs: Date.UTC(2025, 11, 17) };
    const csv = buildYearSummaryCsv({
      summary: {
        ...summary,
        rewards: summary.rewards.map((reward) => ({ ...reward, rate: fiatRate })),
        holdingsRate: fiatRate,
      },
      currency: 'EUR',
      labels: { ...labels, headers: { ...labels.headers, fiatRateDate: 'EUR rate date' } },
    });

    expect(csv).toContain(
      '\r\nDate,Account,Account ID,Neuron ID,Amount,Price,Value,Rate date,EUR rate date\r\n',
    );
    expect(csv).toContain(
      `\r\n2025-12-20 09:00:00,Main,${MAIN},,10.00000000,2.00000000,20.00,2025-12-20,2025-12-17\r\nTotal,,,,10.00000000,,20.00,,\r\n`,
    );
    expect(csv).toContain('\r\nRate date,2025-12-20\r\nEUR rate date,2025-12-17\r\n');
  });

  it('adds the maturity for the current year', () => {
    const csv = buildYearSummaryCsv({
      summary: { ...summary, maturityE8s: 4n * ICP },
      currency: 'EUR',
      labels,
    });

    expect(csv).toContain('\r\nRate date,2025-12-20\r\nMaturity,4.00000000\r\n\r\nMovements');
  });
});
