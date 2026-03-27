import { t } from 'i18next';

import { isCertifiedRejectError } from './certified';
import { mapGovernanceCanisterError } from './governance';
import { mapLedgerCanisterError } from './ledger';

export { isCertifiedRejectError };

const MAX_FRIENDLY_MESSAGE_LENGTH = 200;

/**
 * Unified error mapper that tries to map an error against all known canister error types.
 * Tries each canister-specific mapper in sequence, then preserves short pre-mapped
 * messages from domain-specific hooks. Falls back to a generic error for long
 * raw network/canister errors.
 */
export const mapCanisterError = (error: Error): string => {
  const governanceMessage = mapGovernanceCanisterError(error);
  if (governanceMessage) return governanceMessage;

  const ledgerMessage = mapLedgerCanisterError(error);
  if (ledgerMessage) return ledgerMessage;

  if (error.message && error.message.length <= MAX_FRIENDLY_MESSAGE_LENGTH) {
    return error.message;
  }

  return t(($) => $.common.unknownError);
};
