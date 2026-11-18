import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import {
  asSafeSpreadsheetText,
  asSpreadsheetText,
  buildCsv,
  type CsvColumn,
  formatE8sForCsv,
  formatUtcDateTime,
} from './csv';
import type { ReportRange } from './period';

/** An account or a neuron account of the user, with the transactions of the report range. */
export type ReportEntity =
  | { kind: 'account'; accountId: string; name: string }
  | { kind: 'neuron'; accountId: string; neuronId: bigint };

export enum ReportTransactionType {
  Received = 'received',
  Sent = 'sent',
  Stake = 'stake',
  Disburse = 'disburse',
  SelfTransfer = 'selfTransfer',
  Reward = 'reward',
  Burn = 'burn',
  Approve = 'approve',
  Unknown = 'unknown',
}

export type ReportTransaction = {
  id: bigint;
  timestampMs: number | undefined;
  type: ReportTransactionType;
  from: string;
  to: string;
  /** The change of the entity balance, without the fee. Negative for a debit. */
  amountE8s: bigint;
  /** The fee that the entity paid, else `undefined`. */
  feeE8s: bigint | undefined;
};

export type TransactionsCsvLabels = {
  headers: {
    index: string;
    date: string;
    account: string;
    accountId: string;
    neuronId: string;
    type: string;
    from: string;
    to: string;
    amount: string;
    fee: string;
  };
  types: Record<ReportTransactionType, string>;
};

export const getTransactionTimestampMs = (
  transaction: IcpIndexDid.Transaction,
): number | undefined => {
  const timestamp = transaction.timestamp[0] ?? transaction.created_at_time[0];
  return timestamp === undefined ? undefined : Number(timestamp.timestamp_nanos / 1_000_000n);
};

const transferType = ({
  entity,
  from,
  to,
  neuronAccountIds,
}: {
  entity: ReportEntity;
  from: string;
  to: string;
  neuronAccountIds: ReadonlySet<string>;
}): ReportTransactionType => {
  const { accountId } = entity;

  if (from === accountId && to === accountId) return ReportTransactionType.SelfTransfer;
  if (entity.kind === 'neuron') {
    return to === accountId ? ReportTransactionType.Stake : ReportTransactionType.Disburse;
  }
  if (from === accountId && neuronAccountIds.has(to)) return ReportTransactionType.Stake;
  if (from === accountId) return ReportTransactionType.Sent;
  if (to === accountId) return ReportTransactionType.Received;
  return ReportTransactionType.Unknown;
};

/** Maps an index transaction to a report row, as the entity sees it. */
export const mapReportTransaction = ({
  entity,
  transaction: { id, transaction },
  neuronAccountIds,
}: {
  entity: ReportEntity;
  transaction: IcpIndexDid.TransactionWithId;
  neuronAccountIds: ReadonlySet<string>;
}): ReportTransaction => {
  const { operation } = transaction;
  const base = { id, timestampMs: getTransactionTimestampMs(transaction) };

  if ('Mint' in operation) {
    return {
      ...base,
      type: ReportTransactionType.Reward,
      from: '',
      to: operation.Mint.to,
      amountE8s: operation.Mint.amount.e8s,
      feeE8s: undefined,
    };
  }

  if ('Burn' in operation) {
    return {
      ...base,
      type: ReportTransactionType.Burn,
      from: operation.Burn.from,
      to: '',
      amountE8s: -operation.Burn.amount.e8s,
      feeE8s: undefined,
    };
  }

  if ('Approve' in operation) {
    const { from, spender, fee } = operation.Approve;
    return {
      ...base,
      type: ReportTransactionType.Approve,
      from,
      to: spender,
      amountE8s: 0n,
      // The index lists an approval for the spender too, but only the approving account pays the fee.
      feeE8s: from === entity.accountId ? fee.e8s : undefined,
    };
  }

  const { from, to, amount, fee } = operation.Transfer;
  const isDebit = from === entity.accountId;
  const isCredit = to === entity.accountId;

  return {
    ...base,
    type: transferType({ entity, from, to, neuronAccountIds }),
    from,
    to,
    amountE8s: isDebit && !isCredit ? -amount.e8s : isCredit && !isDebit ? amount.e8s : 0n,
    feeE8s: isDebit ? fee.e8s : undefined,
  };
};

/** A transaction without a timestamp stays in the report, because the range cannot rule it out. */
export const isInRange = ({ timestampMs }: ReportTransaction, { fromMs, toMs }: ReportRange) =>
  timestampMs === undefined || (timestampMs >= fromMs && timestampMs < toMs);

export type EntityTransactions = {
  entity: ReportEntity;
  transactions: ReportTransaction[];
};

type TransactionRow = {
  entity: ReportEntity;
  transaction: ReportTransaction;
};

const byNewestFirst = (a: TransactionRow, b: TransactionRow): number =>
  (b.transaction.timestampMs ?? 0) - (a.transaction.timestampMs ?? 0) ||
  Number(b.transaction.id - a.transaction.id);

/**
 * One flat table, newest first. A transfer between two accounts of the user has one row for each
 * account, because each account sees its own side of it.
 */
export const buildTransactionsCsv = ({
  results,
  labels,
}: {
  results: EntityTransactions[];
  labels: TransactionsCsvLabels;
}): string => {
  const { headers } = labels;

  const columns: CsvColumn<TransactionRow>[] = [
    { header: headers.index, value: ({ transaction }) => transaction.id.toString() },
    {
      header: headers.date,
      value: ({ transaction }) =>
        transaction.timestampMs === undefined ? '' : formatUtcDateTime(transaction.timestampMs),
    },
    {
      header: headers.account,
      value: ({ entity }) => (entity.kind === 'account' ? asSafeSpreadsheetText(entity.name) : ''),
    },
    { header: headers.accountId, value: ({ entity }) => entity.accountId },
    {
      header: headers.neuronId,
      value: ({ entity }) =>
        entity.kind === 'neuron' ? asSpreadsheetText(entity.neuronId.toString()) : '',
    },
    { header: headers.type, value: ({ transaction }) => labels.types[transaction.type] },
    { header: headers.from, value: ({ transaction }) => asSafeSpreadsheetText(transaction.from) },
    { header: headers.to, value: ({ transaction }) => asSafeSpreadsheetText(transaction.to) },
    {
      header: headers.amount,
      value: ({ transaction }) => formatE8sForCsv(transaction.amountE8s, { signed: true }),
    },
    {
      header: headers.fee,
      value: ({ transaction }) =>
        transaction.feeE8s === undefined ? '' : formatE8sForCsv(transaction.feeE8s),
    },
  ];

  const rows = results
    .flatMap(({ entity, transactions }) =>
      transactions.map((transaction) => ({ entity, transaction })),
    )
    .toSorted(byNewestFirst);

  return buildCsv(columns, rows);
};
