/** BIP-44 path of the first Internet Computer account on the device. */
export const LEDGER_DEFAULT_DERIVE_PATH = `m/44'/223'/0'/0/0`;

/** Length in bytes of a secp256k1 signature in (r, s) form. */
export const LEDGER_SIGNATURE_LENGTH = 64;

/**
 * First Internet Computer app version that parses every transaction as Candid.
 * Older apps expect protobuf and reject the calls this app sends.
 */
export const LEDGER_MIN_APP_VERSION = '2.4.9';

/**
 * Return codes of the Internet Computer app.
 * The values match `LedgerError` in `@zondax/ledger-js`. They are declared here so
 * the main bundle does not load that package.
 */
export enum LedgerReturnCode {
  NoErrors = 0x9000,
  WrongLength = 0x6700,
  TransactionRejected = 0x6986,
  AppNotOpen = 0x6e01,
  UnknownError = 0x6f00,
  CannotFetchPublicKey = 0xffff,
}
