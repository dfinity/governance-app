import { t } from 'i18next';

import { isCertifiedRejectError } from './certified';
import { mapGovernanceCanisterError } from './governance';
import { mapLedgerCanisterError } from './ledger';

export { isCertifiedRejectError };

/**
 * Unified error mapper that tries to map an error against all known canister error types.
 * Tries each canister-specific mapper in sequence and returns the first match,
 * or falls back to a generic error message.
 */
export const mapCanisterError = (error: Error): string => {
  const governanceMessage = mapGovernanceCanisterError(error);
  if (governanceMessage) {
    return governanceMessage;
  }

  const ledgerMessage = mapLedgerCanisterError(error);
  if (ledgerMessage) {
    return ledgerMessage;
  }

  return t(($) => $.common.unknownError);
};
