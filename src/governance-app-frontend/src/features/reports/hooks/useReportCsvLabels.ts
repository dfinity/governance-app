import { NeuronState } from '@icp-sdk/canisters/nns';
import { useTranslation } from 'react-i18next';

import type { FiatCurrency } from '@constants/fiat';

import { NeuronAccess, type NeuronsCsvLabels } from '../utils/neuronsCsv';
import { ReportTransactionType, type TransactionsCsvLabels } from '../utils/transactionsCsv';

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

  return {
    headers: {
      index: t(($) => $.reports.csv.transactions.index),
      date: t(($) => $.reports.csv.transactions.date),
      account: t(($) => $.reports.csv.transactions.account),
      accountId: t(($) => $.reports.csv.transactions.accountId),
      neuronId: t(($) => $.reports.csv.transactions.neuronId),
      type: t(($) => $.reports.csv.transactions.type),
      from: t(($) => $.reports.csv.transactions.from),
      to: t(($) => $.reports.csv.transactions.to),
      amount: t(($) => $.reports.csv.transactions.amount),
      fee: t(($) => $.reports.csv.transactions.fee),
      price: t(($) => $.reports.csv.transactions.price, { currency }),
      value: t(($) => $.reports.csv.transactions.value, { currency }),
      rateDate: t(($) => $.reports.csv.transactions.rateDate),
    },
    types: {
      [ReportTransactionType.Received]: t(($) => $.reports.csv.types.received),
      [ReportTransactionType.Sent]: t(($) => $.reports.csv.types.sent),
      [ReportTransactionType.Stake]: t(($) => $.reports.csv.types.stake),
      [ReportTransactionType.Disburse]: t(($) => $.reports.csv.types.disburse),
      [ReportTransactionType.SelfTransfer]: t(($) => $.reports.csv.types.selfTransfer),
      [ReportTransactionType.Reward]: t(($) => $.reports.csv.types.reward),
      [ReportTransactionType.Burn]: t(($) => $.reports.csv.types.burn),
      [ReportTransactionType.Approve]: t(($) => $.reports.csv.types.approve),
      [ReportTransactionType.Unknown]: t(($) => $.reports.csv.types.unknown),
    },
  };
};
