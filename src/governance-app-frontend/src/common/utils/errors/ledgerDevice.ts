import { t } from 'i18next';

import { isLedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

/**
 * Maps a `LedgerDeviceError` to the user-facing text of its code.
 * Returns `undefined` for every other error.
 */
export const mapLedgerDeviceError = (error: Error): string | undefined => {
  if (!isLedgerDeviceError(error)) return undefined;

  switch (error.code) {
    case LedgerErrorCode.BrowserNotSupported:
      return t(($) => $.errors.ledgerDeviceErrors.browserNotSupported);
    case LedgerErrorCode.AccessDenied:
      return t(($) => $.errors.ledgerDeviceErrors.accessDenied);
    case LedgerErrorCode.NoDevice:
      return t(($) => $.errors.ledgerDeviceErrors.noDevice);
    case LedgerErrorCode.OtherAppOpen:
      return t(($) => $.errors.ledgerDeviceErrors.otherAppOpen);
    case LedgerErrorCode.ConnectFailed:
      return t(($) => $.errors.ledgerDeviceErrors.connectFailed);
    case LedgerErrorCode.AppNotOpen:
      return t(($) => $.errors.ledgerDeviceErrors.appNotOpen);
    case LedgerErrorCode.Locked:
      return t(($) => $.errors.ledgerDeviceErrors.locked);
    case LedgerErrorCode.FetchPublicKey:
      return t(($) => $.errors.ledgerDeviceErrors.fetchPublicKey);
    case LedgerErrorCode.PrincipalMismatch:
      return t(($) => $.errors.ledgerDeviceErrors.principalMismatch);
    case LedgerErrorCode.UnexpectedDevice:
      return error.details.expected
        ? t(($) => $.errors.ledgerDeviceErrors.unexpectedDevice, {
            expected: error.details.expected,
          })
        : t(($) => $.errors.ledgerDeviceErrors.unexpectedDeviceUnknown);
    case LedgerErrorCode.UserRejected:
      return t(($) => $.errors.ledgerDeviceErrors.userRejected);
    case LedgerErrorCode.SignatureUnexpected:
      return t(($) => $.errors.ledgerDeviceErrors.signatureUnexpected);
    case LedgerErrorCode.SignatureLength:
      return t(($) => $.errors.ledgerDeviceErrors.signatureLength);
    case LedgerErrorCode.AppVersionNotSupported:
      return t(($) => $.errors.ledgerDeviceErrors.appVersionNotSupported);
    case LedgerErrorCode.SessionClosed:
      return t(($) => $.errors.ledgerDeviceErrors.sessionClosed);
    case LedgerErrorCode.Disconnected:
      return t(($) => $.errors.ledgerDeviceErrors.disconnected);
    case LedgerErrorCode.Unexpected:
      return t(($) => $.errors.ledgerDeviceErrors.unexpected);
  }
};
