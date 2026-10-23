import {
  BadFeeError,
  IcrcError,
  InsufficientFundsError,
  InvalidAccountIDError,
  InvalidSenderError,
  TransferError,
  TxCreatedInFutureError,
  TxDuplicateError,
  TxTooOldError,
} from '@icp-sdk/canisters/ledger/icp';
import {
  CouldNotClaimNeuronError,
  GovernanceError,
  InsufficientAmountError,
} from '@icp-sdk/canisters/nns';
import { AgentError } from '@icp-sdk/core/agent';

import { isDeviceActionCancelled } from '@hooks/useDeviceAction';
import { CanisterResponseError } from '@utils/errors/response';
import { isLedgerDeviceError } from '@common/ledger/errors';

const toSnakeCase = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/**
 * Maps an error to a short category for the `reason` property.
 * It never returns the error message, because a message can hold account IDs or amounts.
 */
export const getErrorReason = (error: unknown): string => {
  if (error instanceof CanisterResponseError) return toSnakeCase(error.variant);
  if (isLedgerDeviceError(error)) return `ledger_${toSnakeCase(error.code)}`;
  if (isDeviceActionCancelled(error)) return 'cancelled';
  if (error instanceof GovernanceError) return `governance_${error.detail.error_type}`;
  if (error instanceof InsufficientAmountError) return 'insufficient_amount';
  if (error instanceof CouldNotClaimNeuronError) return 'could_not_claim_neuron';
  if (error instanceof InsufficientFundsError) return 'insufficient_funds';
  if (error instanceof BadFeeError) return 'bad_fee';
  if (error instanceof TxTooOldError) return 'tx_too_old';
  if (error instanceof TxCreatedInFutureError) return 'tx_created_in_future';
  if (error instanceof TxDuplicateError) return 'tx_duplicate';
  if (error instanceof InvalidSenderError) return 'invalid_sender';
  if (error instanceof InvalidAccountIDError) return 'invalid_account_id';
  if (error instanceof TransferError) return 'transfer_error';
  if (error instanceof IcrcError) return 'ledger_error';
  if (error instanceof AgentError) return `agent_${error.kind.toLowerCase()}`;
  return 'unknown';
};

const AMOUNT_RANGES: [number, string][] = [
  [1, '<1'],
  [10, '1-10'],
  [100, '10-100'],
  [1_000, '100-1k'],
  [10_000, '1k-10k'],
];

/**
 * Maps an ICP amount to a range for the `amount_range` property.
 * An exact amount and the event time could identify the transaction on chain.
 */
export const getAmountRange = (icp: number): string => {
  if (!Number.isFinite(icp) || icp < 0) return 'unknown';
  return AMOUNT_RANGES.find(([max]) => icp < max)?.[1] ?? '10k+';
};
