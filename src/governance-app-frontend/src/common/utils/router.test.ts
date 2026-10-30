import type { Identity } from '@icp-sdk/core/agent';
import type { ParsedLocation } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isSafeInternalRedirect, requireIdentity } from './router';

const { session, warningNotification } = vi.hoisted(() => ({
  session: { identity: undefined as Identity | undefined, logoutRedirectPending: false },
  warningNotification: vi.fn(),
}));

vi.mock('@common/auth/internetIdentity', () => ({
  ensureInitialized: async () => session.identity,
  consumeLogoutRedirect: () => {
    const pending = session.logoutRedirectPending;
    session.logoutRedirectPending = false;
    return pending;
  },
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
    session.identity = undefined;
    session.logoutRedirectPending = false;
    warningNotification.mockClear();
  });

  it('sends a visitor without a session to the login page with the route and a notice.', async () => {
    await expect(guard('/dashboard')).resolves.toEqual(
      expect.objectContaining({ to: '/', search: { redirect: '/dashboard' } }),
    );
    expect(warningNotification).toHaveBeenCalledTimes(1);
  });

  it('sends the user to the login page without a notice on a logout.', async () => {
    session.logoutRedirectPending = true;

    const redirect = await guard('/dashboard');

    expect(redirect).toEqual(expect.objectContaining({ to: '/' }));
    expect(redirect).not.toHaveProperty('search.redirect');
    expect(warningNotification).not.toHaveBeenCalled();
  });

  it('keeps the route and the notice for navigation after the logout.', async () => {
    session.logoutRedirectPending = true;
    await guard('/dashboard');

    // For example, browser Back to a protected page.
    await expect(guard('/neurons')).resolves.toEqual(
      expect.objectContaining({ to: '/', search: { redirect: '/neurons' } }),
    );
    expect(warningNotification).toHaveBeenCalledTimes(1);
  });
});
