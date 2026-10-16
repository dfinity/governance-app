import type { DerEncodedPublicKey, PublicKey } from '@icp-sdk/core/agent';
import { uint8ArraysEqual } from '@dfinity/utils';

/**
 * Public key of the Ledger device.
 * Adapted from `Ed25519PublicKey` in agent-js with the secp256k1 key length and DER prefix.
 */
export class Secp256k1PublicKey implements PublicKey {
  public static from(key: PublicKey): Secp256k1PublicKey {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: Uint8Array): Secp256k1PublicKey {
    return new Secp256k1PublicKey(rawKey);
  }

  public static fromDer(derKey: DerEncodedPublicKey): Secp256k1PublicKey {
    return new Secp256k1PublicKey(this.derDecode(derKey));
  }

  // The length of secp256k1 public keys is always 65 bytes.
  private static RAW_KEY_LENGTH = 65;

  // Adding this prefix to a raw public key is sufficient to DER-encode it.
  // prettier-ignore
  private static DER_PREFIX = Uint8Array.from([
    0x30, 0x56, // SEQUENCE
    0x30, 0x10, // SEQUENCE
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ECDSA
    0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a, // OID secp256k1
    0x03, 0x42, // BIT STRING
    0x00, // no padding
  ]);

  private static derEncode(publicKey: Uint8Array): DerEncodedPublicKey {
    if (publicKey.byteLength !== Secp256k1PublicKey.RAW_KEY_LENGTH) {
      throw new TypeError(
        `secp256k1 public key must be ${Secp256k1PublicKey.RAW_KEY_LENGTH} bytes long (is ${publicKey.byteLength})`,
      );
    }

    const { DER_PREFIX } = Secp256k1PublicKey;
    const derPublicKey = new Uint8Array(DER_PREFIX.length + publicKey.length);
    derPublicKey.set(DER_PREFIX);
    derPublicKey.set(publicKey, DER_PREFIX.length);

    return derPublicKey as DerEncodedPublicKey;
  }

  private static derDecode(key: DerEncodedPublicKey): Uint8Array {
    const { DER_PREFIX, RAW_KEY_LENGTH } = Secp256k1PublicKey;
    const expectedLength = DER_PREFIX.length + RAW_KEY_LENGTH;
    if (key.byteLength !== expectedLength) {
      throw new TypeError(
        `secp256k1 DER-encoded public key must be ${expectedLength} bytes long (is ${key.byteLength})`,
      );
    }

    const rawKey = key.slice(DER_PREFIX.length);
    if (!uint8ArraysEqual({ a: this.derEncode(rawKey), b: key })) {
      throw new TypeError(
        'secp256k1 DER-encoded public key is invalid. A valid secp256k1 DER-encoded public key ' +
          `must have the following prefix: ${DER_PREFIX}`,
      );
    }

    return rawKey;
  }

  readonly #rawKey: Uint8Array;
  readonly #derKey: DerEncodedPublicKey;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: Uint8Array) {
    this.#rawKey = key;
    this.#derKey = Secp256k1PublicKey.derEncode(key);
  }

  public get rawKey(): Uint8Array {
    return this.#rawKey;
  }

  public get derKey(): DerEncodedPublicKey {
    return this.#derKey;
  }

  public toDer(): DerEncodedPublicKey {
    return this.#derKey;
  }

  public toRaw(): Uint8Array {
    return this.#rawKey;
  }
}
