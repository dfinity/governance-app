import { NeuronState } from '@icp-sdk/canisters/nns';
import { useTranslation } from 'react-i18next';

import { FiatCurrency } from '@constants/fiat';

import { formatUtcDate } from '../utils/csv';
import { NeuronAccess, type NeuronsCsvLabels } from '../utils/neuronsCsv';
import { ReportTransactionType, type TransactionsCsvLabels } from '../utils/transactionsCsv';
import type { YearPeriod } from '../utils/yearSummary';
import type { YearSummaryCsvLabels } from '../utils/yearSummaryCsv';

/** For a currency other than USD, the ICP/USD and USD/fiat rates can come from different days. */
const useRateDateHeaders = (
  currency: FiatCurrency,
): { rateDate: string; fiatRateDate?: string } => {
  const { t } = useTranslation();

  return currency === FiatCurrency.USD
    ? { rateDate: t(($) => $.reports.csv.transactions.rateDate) }
    : {
        rateDate: t(($) => $.reports.csv.transactions.icpRateDate),
        fiatRateDate: t(($) => $.reports.csv.transactions.fiatRateDate, { currency }),
      };
};

export const useNeuronsCsvLabels = (currency: FiatCurrency): NeuronsCsvLabels => {
  const { t } = useTranslation();

  return {
    headers: {
      neuronId: t(($) => $.reports.csv.neurons.neuronId),
      neuronAccountId: t(($) => $.reports.csv.neurons.neuronAccountId),
      controller: t(($) => $.reports.csv.neurons.controller),
      access: t(($) => $.reports.csv.neurons.access),
      stake: t(($) => $.reports.csv.neurons.stake),
      stakeValue: t(($) => $.reports.csv.neurons.stakeValue, { currency }),
      availableMaturity: t(($) => $.reports.csv.neurons.availableMaturity),
      stakedMaturity: t(($) => $.reports.csv.neurons.stakedMaturity),
      disbursingMaturity: t(($) => $.reports.csv.neurons.disbursingMaturity),
      dissolveDelayDays: t(($) => $.reports.csv.neurons.dissolveDelayDays),
      dissolveDate: t(($) => $.reports.csv.neurons.dissolveDate),
      creationDate: t(($) => $.reports.csv.neurons.creationDate),
      state: t(($) => $.reports.csv.neurons.state),
    },
    states: {
      [NeuronState.Unspecified]: t(($) => $.reports.csv.states.unspecified),
      [NeuronState.Locked]: t(($) => $.reports.csv.states.locked),
      [NeuronState.Dissolving]: t(($) => $.reports.csv.states.dissolving),
      [NeuronState.Dissolved]: t(($) => $.reports.csv.states.dissolved),
      [NeuronState.Spawning]: t(($) => $.reports.csv.states.spawning),
    },
    access: {
      [NeuronAccess.Controller]: t(($) => $.reports.csv.access.controller),
      [NeuronAccess.LedgerDevice]: t(($) => $.reports.csv.access.ledgerDevice),
      [NeuronAccess.Hotkey]: t(($) => $.reports.csv.access.hotkey),
    },
  };
};

export const useTransactionsCsvLabels = (currency: FiatCurrency): TransactionsCsvLabels => {
  const { t } = useTranslation();
  const rateDateHeaders = useRateDateHeaders(currency);

  return {
    headers: {
      index: t(($) => $.reports.csv.transactions.index),
      date: t(($) => $.reports.csv.transactions.date),
      account: t(($) => $.reports.csv.transactions.account),
      accountId: t(($) => $.reports.csv.transactions.accountId),
      neuronId: t(($) => $.reports.csv.transactions.neuronId),
      type: t(($) => $.reports.csv.transactions.type),
      fromName: t(($) => $.reports.csv.transactions.fromName),
      from: t(($) => $.reports.csv.transactions.from),
      toName: t(($) => $.reports.csv.transactions.toName),
      to: t(($) => $.reports.csv.transactions.to),
      amount: t(($) => $.reports.csv.transactions.amount),
      fee: t(($) => $.reports.csv.transactions.fee),
      price: t(($) => $.reports.csv.transactions.price, { currency }),
      value: t(($) => $.reports.csv.transactions.value, { currency }),
      ...rateDateHeaders,
    },
    types: {
      [ReportTransactionType.Received]: t(($) => $.reports.csv.types.received),
      [ReportTransactionType.Sent]: t(($) => $.reports.csv.types.sent),
      [ReportTransactionType.Stake]: t(($) => $.reports.csv.types.stake),
      [ReportTransactionType.Disburse]: t(($) => $.reports.csv.types.disburse),
      [ReportTransactionType.SelfTransfer]: t(($) => $.reports.csv.types.selfTransfer),
      [ReportTransactionType.OwnTransfer]: t(($) => $.reports.csv.types.ownTransfer),
      [ReportTransactionType.Reward]: t(($) => $.reports.csv.types.reward),
      [ReportTransactionType.Burn]: t(($) => $.reports.csv.types.burn),
      [ReportTransactionType.Approve]: t(($) => $.reports.csv.types.approve),
      [ReportTransactionType.Unknown]: t(($) => $.reports.csv.types.unknown),
    },
    neuronName: (id) => t(($) => $.reports.csv.neuronName, { id }),
  };
};

export const useYearSummaryLimits = (): string[] => {
  const { t } = useTranslation();

  return [
    t(($) => $.reports.yearSummary.limits.externalDisbursements),
    t(($) => $.reports.yearSummary.limits.pastMaturity),
    t(($) => $.reports.yearSummary.limits.deviceNeurons),
    t(($) => $.reports.yearSummary.limits.gains),
    t(($) => $.reports.yearSummary.limits.rates),
  ];
};

export const useYearSummaryCsvLabels = ({
  currency,
  period,
}: {
  currency: FiatCurrency;
  period: YearPeriod;
}): YearSummaryCsvLabels => {
  const { t } = useTranslation();
  const limits = useYearSummaryLimits();
  const rateDateHeaders = useRateDateHeaders(currency);

  return {
    title: t(($) => $.reports.csv.yearSummary.title),
    period: t(($) => $.reports.csv.yearSummary.period),
    currency: t(($) => $.reports.csv.yearSummary.currency),
    total: t(($) => $.reports.csv.yearSummary.total),
    rewards: t(($) => $.reports.csv.yearSummary.rewards),
    holdings: period.isCurrentYear
      ? t(($) => $.reports.csv.yearSummary.holdingsToday)
      : t(($) => $.reports.csv.yearSummary.holdingsOn, { date: formatUtcDate(period.toMs - 1) }),
    movements: t(($) => $.reports.csv.yearSummary.movements),
    notIncluded: t(($) => $.reports.csv.yearSummary.notIncluded),
    incomplete: t(($) => $.reports.yearSummary.incomplete),
    headers: {
      date: t(($) => $.reports.csv.transactions.date),
      account: t(($) => $.reports.csv.transactions.account),
      accountId: t(($) => $.reports.csv.transactions.accountId),
      neuronId: t(($) => $.reports.csv.transactions.neuronId),
      amount: t(($) => $.reports.csv.transactions.amount),
      balance: t(($) => $.reports.csv.yearSummary.balance),
      price: t(($) => $.reports.csv.transactions.price, { currency }),
      value: t(($) => $.reports.csv.transactions.value, { currency }),
      ...rateDateHeaders,
      maturity: t(($) => $.reports.csv.yearSummary.maturity),
      received: t(($) => $.reports.csv.yearSummary.received),
      sent: t(($) => $.reports.csv.yearSummary.sent),
      fees: t(($) => $.reports.csv.yearSummary.fees),
    },
    limits,
  };
};
