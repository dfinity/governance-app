import '@/i18n/config';

import { describe, expect, it } from 'vitest';

import { LedgerDeviceError, LedgerErrorCode } from '@common/ledger/errors';

import { mapCanisterError } from './index';
import { mapLedgerDeviceError } from './ledgerDevice';

describe('mapLedgerDeviceError', () => {
  it('maps a device error code to its text', () => {
    const message = mapLedgerDeviceError(new LedgerDeviceError(LedgerErrorCode.UserRejected));

    expect(message).toBe('You rejected the request on the device.');
  });

  it('fills the expected principal of an unexpected device', () => {
    const message = mapLedgerDeviceError(
      new LedgerDeviceError(LedgerErrorCode.UnexpectedDevice, {
        expected: 'aaaaa-aa',
        actual: 'bbbbb-bb',
      }),
    );

    expect(message).toContain('aaaaa-aa');
  });

  it('ignores other errors', () => {
    expect(mapLedgerDeviceError(new Error('userRejected'))).toBeUndefined();
  });

  it('is part of the unified canister error mapper', () => {
    const message = mapCanisterError(new LedgerDeviceError(LedgerErrorCode.Locked));

    expect(message).toBe('The device is locked. Unlock it and try again.');
  });
});
