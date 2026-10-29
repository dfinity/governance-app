import { afterEach, describe, expect, it, vi } from 'vitest';

import { II_SIGNER } from '@common/ledger/signer';

import { AccountType, canSignFromAccount, getAccountSigner, isAccountOffered } from './types';

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

describe('isAccountOffered', () => {
  const NONE = { subaccounts: false, ledgerDevice: false };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('always offers the main account', () => {
    expect(isAccountOffered({ type: AccountType.Main }, NONE)).toBe(true);
  });

  it('offers a sub-account only with the subaccounts feature', () => {
    expect(isAccountOffered({ type: AccountType.Subaccount }, NONE)).toBe(false);
    expect(isAccountOffered({ type: AccountType.Subaccount }, { ...NONE, subaccounts: true })).toBe(
      true,
    );
  });

  it('offers a Ledger device account only with the ledgerDevice feature, without WebHID', () => {
    withWebHid(false);

    expect(isAccountOffered(DEVICE, NONE)).toBe(false);
    expect(isAccountOffered(DEVICE, { ...NONE, ledgerDevice: true })).toBe(true);
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
