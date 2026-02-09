import { describe, expect, it } from 'vitest';

import { buildTrustedAddresses, isSuspiciousAddress } from './addressPoisoning';

// 64-char hex addresses for testing. Prefix = first 4 chars, suffix = last 2 chars.
const TRUSTED_ADDRESS = 'aaaa1111111111111111111111111111111111111111111111111111111111ff';
// Same prefix (aaaa) + same suffix (ff), different middle → should be flagged.
const SIMILAR_ADDRESS = 'aaaa2222222222222222222222222222222222222222222222222222222222ff';
// Same prefix (aaaa), different suffix (00) → should NOT be flagged.
const DIFFERENT_SUFFIX = 'aaaa333333333333333333333333333333333333333333333333333333333300';
// Different prefix (bbbb), same suffix (ff) → should NOT be flagged.
const DIFFERENT_PREFIX = 'bbbb4444444444444444444444444444444444444444444444444444444444ff';

// Amount boundaries (threshold is 100_000n = 0.001 ICP).
const BELOW_THRESHOLD = 10_000n;
const AT_THRESHOLD = 100_000n;
const ABOVE_THRESHOLD = 100_001n;

describe('isSuspiciousAddress', () => {
  const trustedSet = new Set([TRUSTED_ADDRESS]);

  it('flags a similar address with a small amount', () => {
    expect(isSuspiciousAddress(SIMILAR_ADDRESS, BELOW_THRESHOLD, trustedSet)).toBe(true);
  });

  it('flags a similar address at exactly the threshold amount', () => {
    expect(isSuspiciousAddress(SIMILAR_ADDRESS, AT_THRESHOLD, trustedSet)).toBe(true);
  });

  it('does not flag a similar address above the threshold amount', () => {
    expect(isSuspiciousAddress(SIMILAR_ADDRESS, ABOVE_THRESHOLD, trustedSet)).toBe(false);
  });

  it('does not flag an identical address (even with small amount)', () => {
    expect(isSuspiciousAddress(TRUSTED_ADDRESS, BELOW_THRESHOLD, trustedSet)).toBe(false);
  });

  it('does not flag when only the prefix matches', () => {
    expect(isSuspiciousAddress(DIFFERENT_SUFFIX, BELOW_THRESHOLD, trustedSet)).toBe(false);
  });

  it('does not flag when only the suffix matches', () => {
    expect(isSuspiciousAddress(DIFFERENT_PREFIX, BELOW_THRESHOLD, trustedSet)).toBe(false);
  });
});

// Helper to build a minimal mock transaction matching IcpIndexDid.Transaction.
const mockTransfer = (from: string, to: string) =>
  ({
    operation: { Transfer: { from, to, amount: { e8s: 0n }, fee: { e8s: 0n } } },
    memo: 0n,
    created_at_time: [],
    icrc1_memo: [],
    timestamp: [],
  }) as Parameters<typeof buildTrustedAddresses>[2][number];

describe('buildTrustedAddresses', () => {
  const USER_ACCOUNT = 'aaaa0000000000000000000000000000000000000000000000000000000000aa';
  const NEURON_ACCOUNT = 'bbbb0000000000000000000000000000000000000000000000000000000000bb';
  const SENT_TO_ACCOUNT = 'cccc0000000000000000000000000000000000000000000000000000000000cc';
  const RECEIVED_FROM_ACCOUNT = 'dddd0000000000000000000000000000000000000000000000000000000000dd';

  it('includes the user account', () => {
    const result = buildTrustedAddresses(USER_ACCOUNT, new Set(), []);
    expect(result.has(USER_ACCOUNT)).toBe(true);
  });

  it('includes neuron accounts', () => {
    const result = buildTrustedAddresses(USER_ACCOUNT, new Set([NEURON_ACCOUNT]), []);
    expect(result.has(NEURON_ACCOUNT)).toBe(true);
  });

  it('includes addresses the user has sent to', () => {
    const txs = [mockTransfer(USER_ACCOUNT, SENT_TO_ACCOUNT)];
    const result = buildTrustedAddresses(USER_ACCOUNT, new Set(), txs);
    expect(result.has(SENT_TO_ACCOUNT)).toBe(true);
  });

  it('does not include addresses that only sent to the user', () => {
    const txs = [mockTransfer(RECEIVED_FROM_ACCOUNT, USER_ACCOUNT)];
    const result = buildTrustedAddresses(USER_ACCOUNT, new Set(), txs);
    expect(result.has(RECEIVED_FROM_ACCOUNT)).toBe(false);
  });

  it('returns only the user account when inputs are empty', () => {
    const result = buildTrustedAddresses(USER_ACCOUNT, new Set(), []);
    expect(result.size).toBe(1);
    expect(result.has(USER_ACCOUNT)).toBe(true);
  });
});
