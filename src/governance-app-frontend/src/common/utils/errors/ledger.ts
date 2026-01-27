import {
  BadFeeError,
  InsufficientFundsError,
  InvalidAccountIDError,
  InvalidSenderError,
  TransferError,
  TxCreatedInFutureError,
  TxDuplicateError,
  TxTooOldError,
} from '@icp-sdk/canisters/ledger/icp';
import { t } from 'i18next';

// ref. https://github.com/nickcen/ic-js/blob/main/packages/ledger/src/errors/ledger.errors.ts

/**
 * Maps ICP Ledger canister errors to user-friendly i18n messages.
 */
export const mapLedgerCanisterError = (error: Error): string | undefined => {
  if (error instanceof InsufficientFundsError) {
    return t(($) => $.errors.ledgerErrors.InsufficientFundsError);
  }

  if (error instanceof BadFeeError) {
    return t(($) => $.errors.ledgerErrors.BadFeeError);
  }

  if (error instanceof TxTooOldError) {
    return t(($) => $.errors.ledgerErrors.TxTooOldError);
  }

  if (error instanceof TxCreatedInFutureError) {
    return t(($) => $.errors.ledgerErrors.TxCreatedInFutureError);
  }

  if (error instanceof TxDuplicateError) {
    return t(($) => $.errors.ledgerErrors.TxDuplicateError);
  }

  if (error instanceof InvalidAccountIDError) {
    return t(($) => $.errors.ledgerErrors.InvalidAccountIDError);
  }

  if (error instanceof InvalidSenderError) {
    return t(($) => $.errors.ledgerErrors.InvalidSenderError);
  }

  // Catch-all for other TransferError subclasses
  if (error instanceof TransferError) {
    return t(($) => $.errors.ledgerErrors.TransferError);
  }

  return undefined;
};
