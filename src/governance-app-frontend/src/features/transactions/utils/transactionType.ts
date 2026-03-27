import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import { TransactionType } from '@features/account/types';

export const getAmountE8s = (operation: IcpIndexDid.Operation): bigint | null => {
  if ('Transfer' in operation) return operation.Transfer.amount.e8s;
  if ('Mint' in operation) return operation.Mint.amount.e8s;
  return null;
};

export const detectTransactionType = (
  operation: IcpIndexDid.Operation,
  accountId: string,
  neuronAccountIds: Set<string>,
): TransactionType => {
  if ('Mint' in operation) return TransactionType.MINT;
  if (!('Transfer' in operation)) return TransactionType.UNKNOWN;

  const transfer = operation.Transfer;

  if (neuronAccountIds.has(transfer.to) && transfer.from === accountId)
    return TransactionType.STAKE;
  if (transfer.from === accountId && transfer.to === accountId) return TransactionType.SELF;
  if (transfer.from === accountId) return TransactionType.SEND;
  if (transfer.to === accountId) return TransactionType.RECEIVE;

  return TransactionType.UNKNOWN;
};
