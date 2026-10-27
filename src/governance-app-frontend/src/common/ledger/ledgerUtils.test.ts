import type { ReadRequest, RequestId } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { hexStringToUint8Array } from '@dfinity/utils';
import type { ResponseAddress, ResponseSign, ResponseSignUpdateCall } from '@zondax/ledger-icp';
import { describe, expect, it } from 'vitest';

import {
  derEncodedPublicKeyHex,
  mockLedgerPublicKey,
  rawPublicKeyHex,
} from '../../../tests/mocks/ledgerIdentity';
import { LEDGER_SIGNATURE_LENGTH, LedgerReturnCode } from './constants';
import { LedgerErrorCode } from './errors';
import {
  assertResponseOk,
  createReadStatePaths,
  decodePublicKey,
  decodeSignature,
  decodeUpdateSignatures,
  getRequestId,
} from './ledgerUtils';

const rawPublicKey = Buffer.from(hexStringToUint8Array(rawPublicKeyHex));
const principalText = Principal.selfAuthenticating(mockLedgerPublicKey.toDer()).toText();
const otherPrincipalText = 'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe';

const address = (overrides: Partial<ResponseAddress>): ResponseAddress => ({
  errorMessage: 'No errors',
  returnCode: LedgerReturnCode.NoErrors,
  publicKey: rawPublicKey,
  principalText,
  ...overrides,
});

describe('decodePublicKey', () => {
  it('returns the public key', () => {
    const publicKey = decodePublicKey(address({}));

    expect(Array.from(publicKey.toDer())).toEqual(
      Array.from(hexStringToUint8Array(derEncodedPublicKeyHex)),
    );
  });

  it.each([
    [LedgerReturnCode.AppNotOpen, LedgerErrorCode.AppNotOpen],
    [LedgerReturnCode.TransactionRejected, LedgerErrorCode.Locked],
    [LedgerReturnCode.CannotFetchPublicKey, LedgerErrorCode.FetchPublicKey],
  ])('maps return code %i to %s', (returnCode, code) => {
    expect(() => decodePublicKey(address({ returnCode }))).toThrow(
      expect.objectContaining({ code }),
    );
  });

  it('fails when the public key is missing', () => {
    expect(() => decodePublicKey(address({ publicKey: undefined }))).toThrow(
      expect.objectContaining({ code: LedgerErrorCode.FetchPublicKey }),
    );
  });

  it('fails when the principal text is missing', () => {
    expect(() => decodePublicKey(address({ principalText: undefined }))).toThrow(
      expect.objectContaining({ code: LedgerErrorCode.FetchPublicKey }),
    );
  });

  it('fails when the principal does not match the public key', () => {
    expect(() => decodePublicKey(address({ principalText: otherPrincipalText }))).toThrow(
      expect.objectContaining({ code: LedgerErrorCode.PrincipalMismatch }),
    );
  });
});

describe('decodeSignature', () => {
  const signature = Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 1);

  it('returns the signature', () => {
    const result = decodeSignature({
      errorMessage: 'No errors',
      returnCode: LedgerReturnCode.NoErrors,
      signatureRS: signature,
    } as ResponseSign);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBe(LEDGER_SIGNATURE_LENGTH);
  });

  it('fails when the user rejected the transaction', () => {
    expect(() =>
      decodeSignature({
        errorMessage: 'Transaction rejected',
        returnCode: LedgerReturnCode.TransactionRejected,
        signatureRS: signature,
      } as ResponseSign),
    ).toThrow(expect.objectContaining({ code: LedgerErrorCode.UserRejected }));
  });

  it('fails with the device answer when the signature is missing', () => {
    expect(() =>
      decodeSignature({
        errorMessage: 'Unknown error',
        returnCode: LedgerReturnCode.UnknownError,
      } as ResponseSign),
    ).toThrow(
      expect.objectContaining({
        code: LedgerErrorCode.SignatureUnexpected,
        details: { code: `${LedgerReturnCode.UnknownError}`, message: 'Unknown error' },
      }),
    );
  });

  it('fails when the signature has the wrong length', () => {
    expect(() =>
      decodeSignature({
        errorMessage: 'No errors',
        returnCode: LedgerReturnCode.NoErrors,
        signatureRS: Buffer.alloc(4),
      } as ResponseSign),
    ).toThrow(
      expect.objectContaining({ code: LedgerErrorCode.SignatureLength, details: { length: '4' } }),
    );
  });
});

describe('decodeUpdateSignatures', () => {
  it('returns both signatures', () => {
    const { callSignature, readStateSignature } = decodeUpdateSignatures({
      errorMessage: 'No errors',
      returnCode: LedgerReturnCode.NoErrors,
      RequestSignatureRS: Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 1),
      StatusReadSignatureRS: Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 2),
    } as ResponseSignUpdateCall);

    expect(callSignature[0]).toBe(1);
    expect(readStateSignature[0]).toBe(2);
  });

  it('fails when the read state signature is missing', () => {
    expect(() =>
      decodeUpdateSignatures({
        errorMessage: 'No errors',
        returnCode: LedgerReturnCode.NoErrors,
        RequestSignatureRS: Buffer.alloc(LEDGER_SIGNATURE_LENGTH),
      } as ResponseSignUpdateCall),
    ).toThrow(expect.objectContaining({ code: LedgerErrorCode.SignatureUnexpected }));
  });
});

describe('getRequestId', () => {
  const requestId = Uint8Array.from([1, 2, 3]) as RequestId;
  const readRequest = (paths: Uint8Array[][]): ReadRequest =>
    ({ request_type: 'read_state', paths }) as unknown as ReadRequest;

  it('returns the id of a call status path', () => {
    expect(getRequestId(readRequest(createReadStatePaths(requestId)))).toEqual(requestId);
  });

  it('returns undefined when there is no path', () => {
    expect(getRequestId(readRequest([]))).toBeUndefined();
  });

  it('returns undefined for another path', () => {
    expect(getRequestId(readRequest([[new TextEncoder().encode('time')]]))).toBeUndefined();
  });
});

describe('assertResponseOk', () => {
  it('accepts a successful answer', () => {
    expect(() =>
      assertResponseOk({ errorMessage: 'No errors', returnCode: LedgerReturnCode.NoErrors }),
    ).not.toThrow();
  });

  it('maps a rejection to the given code', () => {
    const response = { errorMessage: 'rejected', returnCode: LedgerReturnCode.TransactionRejected };

    expect(() => assertResponseOk(response)).toThrow(
      expect.objectContaining({ code: LedgerErrorCode.UserRejected }),
    );
    expect(() => assertResponseOk(response, LedgerErrorCode.Locked)).toThrow(
      expect.objectContaining({ code: LedgerErrorCode.Locked }),
    );
  });

  it('maps a closed app', () => {
    expect(() =>
      assertResponseOk({ errorMessage: 'app not open', returnCode: LedgerReturnCode.AppNotOpen }),
    ).toThrow(expect.objectContaining({ code: LedgerErrorCode.AppNotOpen }));
  });

  it('keeps the device message for any other code', () => {
    expect(() =>
      assertResponseOk({ errorMessage: 'Wrong Length', returnCode: LedgerReturnCode.WrongLength }),
    ).toThrow(
      expect.objectContaining({
        code: LedgerErrorCode.Unexpected,
        details: { error: `Wrong Length (code ${LedgerReturnCode.WrongLength})` },
      }),
    );
  });
});
