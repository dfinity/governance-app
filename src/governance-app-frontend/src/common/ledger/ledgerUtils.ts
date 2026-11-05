import type { ReadRequest, RequestId, Signature } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { isNullish } from '@dfinity/utils';
import type {
  ResponseAddress,
  ResponseBase,
  ResponseSign,
  ResponseSignUpdateCall,
} from '@zondax/ledger-icp';

import { LEDGER_SIGNATURE_LENGTH, LedgerReturnCode } from './constants';
import { LedgerDeviceError, LedgerErrorCode } from './errors';
import { Secp256k1PublicKey } from './secp256k1';

/**
 * Throws when the device answered with an error code.
 * `rejectedCode` is the error for a `TransactionRejected` answer; its meaning depends on the command.
 */
export const assertResponseOk = (
  { returnCode, errorMessage }: ResponseBase,
  rejectedCode: LedgerErrorCode = LedgerErrorCode.UserRejected,
): void => {
  if (returnCode === LedgerReturnCode.NoErrors) return;

  if (returnCode === LedgerReturnCode.TransactionRejected) {
    throw new LedgerDeviceError(rejectedCode);
  }

  if (returnCode === LedgerReturnCode.AppNotOpen) {
    throw new LedgerDeviceError(LedgerErrorCode.AppNotOpen);
  }

  throw new LedgerDeviceError(LedgerErrorCode.Unexpected, {
    error: `${errorMessage} (code ${returnCode})`,
  });
};

/** Reads the public key out of a `getAddressAndPubKey` answer and checks it against the principal. */
export const decodePublicKey = ({
  principalText,
  publicKey: responsePublicKey,
  returnCode,
}: ResponseAddress): Secp256k1PublicKey => {
  if (returnCode === LedgerReturnCode.AppNotOpen) {
    throw new LedgerDeviceError(LedgerErrorCode.AppNotOpen);
  }

  if (returnCode === LedgerReturnCode.TransactionRejected) {
    throw new LedgerDeviceError(LedgerErrorCode.Locked);
  }

  if (returnCode === LedgerReturnCode.CannotFetchPublicKey) {
    throw new LedgerDeviceError(LedgerErrorCode.FetchPublicKey);
  }

  if (isNullish(responsePublicKey) || isNullish(principalText)) {
    throw new LedgerDeviceError(LedgerErrorCode.FetchPublicKey);
  }

  const publicKey = Secp256k1PublicKey.fromRaw(Uint8Array.from(responsePublicKey));

  if (principalText !== Principal.selfAuthenticating(publicKey.toDer()).toText()) {
    throw new LedgerDeviceError(LedgerErrorCode.PrincipalMismatch);
  }

  return publicKey;
};

const checkReturnCode = (returnCode: number): void => {
  if (returnCode === LedgerReturnCode.TransactionRejected) {
    throw new LedgerDeviceError(LedgerErrorCode.UserRejected);
  }
};

const checkSignature = ({
  signature,
  returnCode,
  errorMessage,
}: {
  signature?: Uint8Array;
  returnCode: number;
  errorMessage?: string;
}): Signature => {
  if (isNullish(signature)) {
    throw new LedgerDeviceError(LedgerErrorCode.SignatureUnexpected, {
      code: `${returnCode}`,
      message: `${errorMessage}`,
    });
  }

  if (signature.byteLength !== LEDGER_SIGNATURE_LENGTH) {
    throw new LedgerDeviceError(LedgerErrorCode.SignatureLength, {
      length: `${signature.byteLength}`,
    });
  }

  return Uint8Array.from(signature) as Signature;
};

/** Reads the signature out of a `sign` answer. */
export const decodeSignature = ({
  signatureRS,
  returnCode,
  errorMessage,
}: ResponseSign): Signature => {
  checkReturnCode(returnCode);

  return checkSignature({ signature: signatureRS, returnCode, errorMessage });
};

export type RequestSignatures = {
  callSignature: Signature;
  readStateSignature: Signature;
};

/** Reads both signatures out of a `signUpdateCall` answer. */
export const decodeUpdateSignatures = ({
  RequestSignatureRS,
  StatusReadSignatureRS,
  returnCode,
  errorMessage,
}: ResponseSignUpdateCall): RequestSignatures => {
  checkReturnCode(returnCode);

  return {
    callSignature: checkSignature({ signature: RequestSignatureRS, returnCode, errorMessage }),
    readStateSignature: checkSignature({
      signature: StatusReadSignatureRS,
      returnCode,
      errorMessage,
    }),
  };
};

const REQUEST_STATUS_LABEL = 'request_status';

/**
 * The request id of a `read_state` request for a call status, or `undefined` for any other path.
 * The interface spec requires every `/request_status/<request_id>` path to carry the same id.
 * https://internetcomputer.org/docs/current/references/ic-interface-spec/#http-read-state
 */
export const getRequestId = (body: ReadRequest): RequestId | undefined => {
  const [path] = (body.paths ?? []) as Uint8Array[][];
  if (isNullish(path) || path.length !== 2) return undefined;

  const [label, requestId] = path;

  return new TextDecoder().decode(label) === REQUEST_STATUS_LABEL
    ? (requestId as RequestId)
    : undefined;
};

export const createReadStatePaths = (requestId: RequestId): Uint8Array[][] => [
  [new TextEncoder().encode(REQUEST_STATUS_LABEL), requestId],
];

/**
 * The value that a CommonJS package exports as `default`.
 *
 * Vite 8 and Node give `import()` of such a package a `default` that is the whole exports
 * object, so the exported value sits one level deeper. Vite 6 and vitest give the value itself.
 */
export const unwrapDefaultExport = <T>(module: { default: T | { default: T } }): T => {
  const { default: value } = module;
  if (typeof value === 'object' && value !== null && 'default' in value) {
    return (value as { default: T }).default;
  }
  return value as T;
};
