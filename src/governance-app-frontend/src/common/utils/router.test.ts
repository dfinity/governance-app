import { describe, expect, it } from 'vitest';

import { isSafeInternalRedirect } from './router';

describe('isSafeInternalRedirect', () => {
  it('accepts same-origin absolute internal paths', () => {
    expect(isSafeInternalRedirect('/dashboard')).toBe(true);
    expect(isSafeInternalRedirect('/neurons/123')).toBe(true);
    expect(isSafeInternalRedirect('/dashboard?tab=staking#top')).toBe(true);
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(isSafeInternalRedirect('https://attacker.example')).toBe(false);
    expect(isSafeInternalRedirect('http://attacker.example')).toBe(false);
    expect(isSafeInternalRedirect('//attacker.example')).toBe(false);
  });

  it('rejects backslash bypass variants', () => {
    expect(isSafeInternalRedirect('/\\attacker.example')).toBe(false);
    expect(isSafeInternalRedirect('\\/attacker.example')).toBe(false);
  });

  it('rejects relative paths and non-string values', () => {
    expect(isSafeInternalRedirect('dashboard')).toBe(false);
    expect(isSafeInternalRedirect('')).toBe(false);
    expect(isSafeInternalRedirect(undefined)).toBe(false);
    expect(isSafeInternalRedirect(null)).toBe(false);
    expect(isSafeInternalRedirect(42)).toBe(false);
  });
});
