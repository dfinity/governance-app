import { describe, expect, it } from 'vitest';

import {
  addressBookGetAccountIdentifier,
  addressBookGetAddressKeys,
  addressBookMatchesAddress,
} from '@utils/addressBook';

const ICP_ADDRESS = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';
const PRINCIPAL = 'h4a5i-5vcfo-5rusv-fmb6m-vrkia-mjnkc-jpoow-h5mam-nthnm-ldqlr-bqe';
// Account identifier of PRINCIPAL with the default subaccount.
const PRINCIPAL_ACCOUNT_ID = '722488363080fac9465ab57bdeee0d5d7284afcdbb166873b8955a3c1464ce64';
// PRINCIPAL with subaccount 1, in the ICRC-1 textual encoding.
const PRINCIPAL_SUBACCOUNT_1 = `${PRINCIPAL}-qh32hua.1`;
const PRINCIPAL_SUBACCOUNT_1_ACCOUNT_ID =
  '394a5269b1c6950b37f68bf7f592bdd1f3b55ec52f4673753733056d8cee10e6';

describe('addressBookGetAccountIdentifier', () => {
  it('returns an ICP address in lowercase', () => {
    expect(addressBookGetAccountIdentifier({ Icp: ICP_ADDRESS })).toBe(ICP_ADDRESS);
    expect(addressBookGetAccountIdentifier({ Icp: ICP_ADDRESS.toUpperCase() })).toBe(ICP_ADDRESS);
  });

  it('returns undefined for an ICP address that does not decode', () => {
    expect(addressBookGetAccountIdentifier({ Icp: 'not-hex' })).toBeUndefined();
  });

  it('derives the account identifier of a principal', () => {
    expect(addressBookGetAccountIdentifier({ Icrc1: PRINCIPAL })).toBe(PRINCIPAL_ACCOUNT_ID);
  });

  it('derives the account identifier of a principal with a subaccount', () => {
    expect(addressBookGetAccountIdentifier({ Icrc1: PRINCIPAL_SUBACCOUNT_1 })).toBe(
      PRINCIPAL_SUBACCOUNT_1_ACCOUNT_ID,
    );
  });

  it('returns undefined for text that does not decode', () => {
    expect(addressBookGetAccountIdentifier({ Icrc1: 'not-a-principal' })).toBeUndefined();
  });
});

describe('addressBookGetAddressKeys', () => {
  it('returns one key for a lowercase ICP address', () => {
    expect(addressBookGetAddressKeys({ Icp: ICP_ADDRESS })).toEqual([ICP_ADDRESS]);
  });

  it('returns the saved text and the lowercase form for an uppercase ICP address', () => {
    expect(addressBookGetAddressKeys({ Icp: ICP_ADDRESS.toUpperCase() })).toEqual([
      ICP_ADDRESS.toUpperCase(),
      ICP_ADDRESS,
    ]);
  });

  it('returns the text and the account identifier for an ICRC-1 address', () => {
    expect(addressBookGetAddressKeys({ Icrc1: PRINCIPAL })).toEqual([
      PRINCIPAL,
      PRINCIPAL_ACCOUNT_ID,
    ]);
  });

  it('returns only the text when the ICRC-1 address does not decode', () => {
    expect(addressBookGetAddressKeys({ Icrc1: 'not-a-principal' })).toEqual(['not-a-principal']);
  });
});

describe('addressBookMatchesAddress', () => {
  it('matches an ICRC-1 entry by its text', () => {
    expect(addressBookMatchesAddress({ Icrc1: PRINCIPAL }, PRINCIPAL)).toBe(true);
  });

  it('matches an ICRC-1 entry by its account identifier', () => {
    expect(addressBookMatchesAddress({ Icrc1: PRINCIPAL }, PRINCIPAL_ACCOUNT_ID)).toBe(true);
  });

  it('does not match another address', () => {
    expect(addressBookMatchesAddress({ Icrc1: PRINCIPAL }, ICP_ADDRESS)).toBe(false);
  });
});
