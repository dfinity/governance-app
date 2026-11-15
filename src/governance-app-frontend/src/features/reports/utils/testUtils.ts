import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

export const MAIN = 'main-account';
export const SAVINGS = 'savings-account';
export const NEURON = 'neuron-account';
export const OTHER = 'other-account';

const timestamp = (ms: number): [IcpIndexDid.TimeStamp] => [
  { timestamp_nanos: BigInt(ms) * 1_000_000n },
];

const withTimestamp = (id: bigint, ms: number, operation: IcpIndexDid.Operation) => ({
  id,
  transaction: {
    memo: 0n,
    icrc1_memo: [],
    operation,
    timestamp: timestamp(ms),
    created_at_time: [],
  } satisfies IcpIndexDid.Transaction,
});

export const transferTx = ({
  id,
  ms,
  from,
  to,
  e8s,
}: {
  id: bigint;
  ms: number;
  from: string;
  to: string;
  e8s: bigint;
}): IcpIndexDid.TransactionWithId =>
  withTimestamp(id, ms, {
    Transfer: { from, to, amount: { e8s }, fee: { e8s: 10_000n }, spender: [] },
  });

export const mintTx = ({
  id,
  ms,
  to,
  e8s,
}: {
  id: bigint;
  ms: number;
  to: string;
  e8s: bigint;
}): IcpIndexDid.TransactionWithId => withTimestamp(id, ms, { Mint: { to, amount: { e8s } } });
