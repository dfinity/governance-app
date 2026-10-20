import type { ParsedLocation } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthState } from '@common/auth/internetIdentity';

import { isSafeInternalRedirect, requireIdentity } from './router';

const { authState, warningNotification } = vi.hoisted(() => ({
  authState: { current: { status: 'idle' } as AuthState },
  warningNotification: vi.fn(),
}));

vi.mock('@common/auth/internetIdentity', () => ({
  ensureInitialized: async () => authState.current.identity,
  getAuthState: () => authState.current,
}));

vi.mock('./notification', () => ({ warningNotification }));

const guard = (pathname: string) =>
  requireIdentity({ location: { pathname } as ParsedLocation }).catch(
    (redirect: Response & { options: { to: string; search?: unknown } }) => redirect.options,
  );

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

describe('requireIdentity', () => {
  beforeEach(() => {
    warningNotification.mockClear();
  });

  it('sends a visitor without a session to the login page with the route and a notice.', async () => {
    authState.current = { status: 'idle' };

    await expect(guard('/dashboard')).resolves.toEqual(
      expect.objectContaining({ to: '/', search: { redirect: '/dashboard' } }),
    );
    expect(warningNotification).toHaveBeenCalledTimes(1);
  });

  it('sends the user to the login page without a notice while a manual logout runs.', async () => {
    authState.current = { status: 'logging-out', sessionEnd: 'logout' };

    const redirect = await guard('/dashboard');

    expect(redirect).toEqual(expect.objectContaining({ to: '/' }));
    expect(redirect).not.toHaveProperty('search.redirect');
    expect(warningNotification).not.toHaveBeenCalled();
  });

  it('sends the user to the login page with a notice after the session expires.', async () => {
    authState.current = { status: 'idle', sessionEnd: 'expiry' };

    await expect(guard('/neurons')).resolves.toEqual(
      expect.objectContaining({ to: '/', search: { redirect: '/neurons' } }),
    );
    expect(warningNotification).toHaveBeenCalledTimes(1);
  });
});
