import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

import { TransactionType } from '@features/account/types';

// @TODO: Add unit tests (send/receive/stake/unknown cases)
export const detectTransactionType = (
  operation: IcpIndexDid.Operation,
  accountId: string,
  neuronAccountIds: Set<string>,
): TransactionType => {
  // @TODO: Add support for Mint
  if (!('Transfer' in operation)) return TransactionType.UNKNOWN;

  const transfer = operation.Transfer;

  if (neuronAccountIds.has(transfer.to) && transfer.from === accountId)
    return TransactionType.STAKE;
  if (transfer.from === accountId) return TransactionType.SEND;
  if (transfer.to === accountId) return TransactionType.RECEIVE;

  return TransactionType.UNKNOWN;
};
