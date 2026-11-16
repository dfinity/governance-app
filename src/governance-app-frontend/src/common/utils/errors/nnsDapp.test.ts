import '@/i18n/config';

import { describe, expect, it } from 'vitest';

import { mapRegisterHardwareWalletError } from './nnsDapp';

describe('mapRegisterHardwareWalletError', () => {
  it.each([
    [{ AccountNotFound: null }, 'Account not found in NNS dapp.'],
    [{ NameTooLong: null }, 'Name is too long.'],
    [{ HardwareWalletAlreadyRegistered: null }, 'This Ledger device is already registered.'],
    [{ HardwareWalletLimitExceeded: null }, 'You reached the maximum number of Ledger devices.'],
  ] as const)('maps %o', (response, expected) => {
    expect(mapRegisterHardwareWalletError(response, 'fallback')).toBe(expected);
  });
});
