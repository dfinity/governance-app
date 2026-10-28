import type { Principal } from '@icp-sdk/core/principal';
import { hexStringToUint8Array } from '@dfinity/utils';
import type { ResponseVersion } from '@zondax/ledger-icp';

import { LEDGER_DEFAULT_DERIVE_PATH } from '@common/ledger/constants';
import { LedgerIdentity } from '@common/ledger/ledgerIdentity';
import { Secp256k1PublicKey } from '@common/ledger/secp256k1';

export const rawPublicKeyHex =
  '0410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b835';

export const derEncodedPublicKeyHex =
  '3056301006072A8648CE3D020106052B8104000A0342000410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b835';

export const mockLedgerPublicKey = Secp256k1PublicKey.fromRaw(
  hexStringToUint8Array(rawPublicKeyHex),
);

type MockIdentityOptions = {
  version?: ResponseVersion;
  principal?: Principal;
};

/** A `LedgerIdentity` with a fixed public key and no device behind it. */
export class MockLedgerIdentity extends LedgerIdentity {
  constructor({ version, principal }: MockIdentityOptions = {}) {
    super(LEDGER_DEFAULT_DERIVE_PATH, mockLedgerPublicKey);

    if (version !== undefined) {
      this.getVersion = () => Promise.resolve(version);
    }

    if (principal !== undefined) {
      this.getPrincipal = () => principal;
    }
  }
}
