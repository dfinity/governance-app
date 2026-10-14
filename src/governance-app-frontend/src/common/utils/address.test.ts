import { describe, expect, it } from 'vitest';

import { addressToAccountIdentifier } from '@utils/address';

const ICP_ADDRESS = 'd4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f';
const PRINCIPAL = 'h4a5i-5vcfo-5rusv-fmb6m-vrkia-mjnkc-jpoow-h5mam-nthnm-ldqlr-bqe';
// Account identifier of PRINCIPAL with the default subaccount.
const PRINCIPAL_ACCOUNT_ID = '722488363080fac9465ab57bdeee0d5d7284afcdbb166873b8955a3c1464ce64';
// PRINCIPAL with subaccount 1, in the ICRC-1 textual encoding.
const PRINCIPAL_SUBACCOUNT_1 = `${PRINCIPAL}-qh32hua.1`;
const PRINCIPAL_SUBACCOUNT_1_ACCOUNT_ID =
  '394a5269b1c6950b37f68bf7f592bdd1f3b55ec52f4673753733056d8cee10e6';

describe('addressToAccountIdentifier', () => {
  it('returns an ICP address in lowercase', () => {
    expect(addressToAccountIdentifier(ICP_ADDRESS)).toBe(ICP_ADDRESS);
    expect(addressToAccountIdentifier(ICP_ADDRESS.toUpperCase())).toBe(ICP_ADDRESS);
  });

  it('derives the account identifier of a principal', () => {
    expect(addressToAccountIdentifier(PRINCIPAL)).toBe(PRINCIPAL_ACCOUNT_ID);
  });

  it('derives the account identifier of a principal with a subaccount', () => {
    expect(addressToAccountIdentifier(PRINCIPAL_SUBACCOUNT_1)).toBe(
      PRINCIPAL_SUBACCOUNT_1_ACCOUNT_ID,
    );
  });

  it('returns undefined for text that is neither form', () => {
    expect(addressToAccountIdentifier('not-an-address')).toBeUndefined();
  });
});
