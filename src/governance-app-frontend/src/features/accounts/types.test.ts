import { afterEach, describe, expect, it, vi } from 'vitest';

import { II_SIGNER } from '@common/ledger/signer';

import { AccountType, canSignFromAccount, getAccountSigner } from './types';

const DEVICE = { type: AccountType.HardwareWallet, principal: 'aaaaa-aa' };

const withWebHid = (supported: boolean) => {
  if (supported) {
    vi.stubGlobal('navigator', { ...navigator, hid: {} });
  } else {
    const stub = { ...navigator } as Navigator & { hid?: unknown };
    delete stub.hid;
    vi.stubGlobal('navigator', stub);
  }
};

describe('canSignFromAccount', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true for the main account and the sub-accounts', () => {
    withWebHid(false);

    expect(canSignFromAccount({ type: AccountType.Main })).toBe(true);
    expect(canSignFromAccount({ type: AccountType.Subaccount })).toBe(true);
  });

  it('is true for a Ledger device account only in a browser with WebHID', () => {
    withWebHid(true);
    expect(canSignFromAccount(DEVICE)).toBe(true);

    withWebHid(false);
    expect(canSignFromAccount(DEVICE)).toBe(false);
  });
});

describe('getAccountSigner', () => {
  it('names the device of a Ledger device account', () => {
    expect(getAccountSigner(DEVICE)).toEqual({ kind: 'ledger', principal: 'aaaaa-aa' });
  });

  it('is the session for every other account, and without an account', () => {
    expect(getAccountSigner({ type: AccountType.Main })).toBe(II_SIGNER);
    expect(getAccountSigner({ type: AccountType.Subaccount })).toBe(II_SIGNER);
    expect(getAccountSigner(undefined)).toBe(II_SIGNER);
  });
});
