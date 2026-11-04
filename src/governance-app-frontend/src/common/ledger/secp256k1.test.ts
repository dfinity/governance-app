import type { DerEncodedPublicKey } from '@icp-sdk/core/agent';
import { hexStringToUint8Array } from '@dfinity/utils';
import { describe, expect, it } from 'vitest';

import { derEncodedPublicKeyHex, rawPublicKeyHex } from '../../../tests/mocks/ledgerIdentity';
import { Secp256k1PublicKey } from './secp256k1';

describe('Secp256k1PublicKey', () => {
  it('DER-encodes a raw key', () => {
    const publicKey = Secp256k1PublicKey.fromRaw(hexStringToUint8Array(rawPublicKeyHex));

    expect(Array.from(publicKey.toDer())).toEqual(
      Array.from(hexStringToUint8Array(derEncodedPublicKeyHex)),
    );
  });

  it('DER-decodes a key', () => {
    const derKey = hexStringToUint8Array(derEncodedPublicKeyHex) as DerEncodedPublicKey;

    expect(Array.from(Secp256k1PublicKey.fromDer(derKey).toRaw())).toEqual(
      Array.from(hexStringToUint8Array(rawPublicKeyHex)),
    );
  });

  it('rejects a raw key with the wrong length', () => {
    // Too short
    expect(() =>
      Secp256k1PublicKey.fromRaw(hexStringToUint8Array(rawPublicKeyHex.slice(0, -2))),
    ).toThrow(TypeError);

    // Too long
    expect(() => Secp256k1PublicKey.fromRaw(hexStringToUint8Array(`${rawPublicKeyHex}00`))).toThrow(
      TypeError,
    );
  });

  it('rejects a DER key with the wrong length or prefix', () => {
    const tooShort = hexStringToUint8Array(derEncodedPublicKeyHex.slice(0, -2));
    const tooLong = hexStringToUint8Array(`${derEncodedPublicKeyHex}00`);
    const wrongPrefix = hexStringToUint8Array(`20${derEncodedPublicKeyHex.slice(2)}`);

    for (const derKey of [tooShort, tooLong, wrongPrefix]) {
      expect(() => Secp256k1PublicKey.fromDer(derKey as DerEncodedPublicKey)).toThrow(TypeError);
    }
  });
});
