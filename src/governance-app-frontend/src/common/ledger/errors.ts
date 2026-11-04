/**
 * Every failure of the Ledger device module maps to one code.
 * The UI translates the code; the module never builds user-facing text.
 */
export enum LedgerErrorCode {
  /** The browser has no WebHID API. */
  BrowserNotSupported = 'browserNotSupported',
  /** The user closed the WebHID device picker. */
  AccessDenied = 'accessDenied',
  /** No device answered the WebHID request. */
  NoDevice = 'noDevice',
  /** Another application (for example Ledger Live) holds the device. */
  OtherAppOpen = 'otherAppOpen',
  /** The transport failed for another reason. `details.error` has the message. */
  ConnectFailed = 'connectFailed',
  /** The Internet Computer app is not open on the device. */
  AppNotOpen = 'appNotOpen',
  /** The device is locked. */
  Locked = 'locked',
  /** The device returned no public key. */
  FetchPublicKey = 'fetchPublicKey',
  /** The device principal does not match its public key. */
  PrincipalMismatch = 'principalMismatch',
  /** The connected device is not the device of this identity. */
  UnexpectedDevice = 'unexpectedDevice',
  /** The user rejected the transaction on the device. */
  UserRejected = 'userRejected',
  /** The device returned no signature. `details.code` and `details.message` have the device answer. */
  SignatureUnexpected = 'signatureUnexpected',
  /** The signature has the wrong length. `details.length` has the actual length. */
  SignatureLength = 'signatureLength',
  /** The app on the device is older than `LEDGER_MIN_APP_VERSION`. `details.version` has the device version. */
  AppVersionNotSupported = 'appVersionNotSupported',
  /** The session closed, for example on logout, while the action was being set up. */
  SessionClosed = 'sessionClosed',
  /** The device was unplugged or stopped answering during an action. */
  Disconnected = 'disconnected',
  /** Any other failure during a device action. `details.error` has the message. */
  Unexpected = 'unexpected',
}

export class LedgerDeviceError extends Error {
  constructor(
    public readonly code: LedgerErrorCode,
    public readonly details: Record<string, string> = {},
  ) {
    super(code);
    this.name = 'LedgerDeviceError';
  }
}

export const isLedgerDeviceError = (error: unknown): error is LedgerDeviceError =>
  error instanceof LedgerDeviceError;

/**
 * Shape of the errors thrown by the Ledger Device Management Kit.
 * Every DMK error carries a `_tag` with its class name.
 */
export interface DmkErrorLike {
  _tag?: string;
  message?: string;
}
