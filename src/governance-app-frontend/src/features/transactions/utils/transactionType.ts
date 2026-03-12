import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

export type DetectedTransactionType = 'send' | 'receive' | 'stake' | 'unknown';

// @TODO: Add unit tests (send/receive/stake/unknown cases)
export const detectTransactionType = (
  operation: IcpIndexDid.Operation,
  accountId: string,
  neuronAccountIds: Set<string>,
): DetectedTransactionType => {
  // @TODO: Add support for Mint
  if (!('Transfer' in operation)) return 'unknown';

  const transfer = operation.Transfer;

  if (neuronAccountIds.has(transfer.to) && transfer.from === accountId) return 'stake';
  if (transfer.from === accountId) return 'send';
  if (transfer.to === accountId) return 'receive';

  return 'unknown';
};
