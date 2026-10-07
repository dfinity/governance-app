import type { AuthClientLoginOptions } from '@icp-sdk/auth/client';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createAuthClient, syncTime, getTimeDiffMsecs } = vi.hoisted(() => ({
  createAuthClient: vi.fn(),
  syncTime: vi.fn(async () => undefined),
  getTimeDiffMsecs: vi.fn(() => 0),
}));

vi.mock('@icp-sdk/auth/client', () => ({
  AuthClient: { create: createAuthClient },
}));

vi.mock('@common/canisters/agents', () => ({
  getAnonymousAgent: async () => ({ syncTime, getTimeDiffMsecs }),
}));

vi.mock('@constants/extra', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@constants/extra')>()),
  IS_LOCAL: false,
}));

const delegationIdentity = async (expiresInMs: number): Promise<DelegationIdentity> => {
  const root = Ed25519KeyIdentity.generate();
  const session = Ed25519KeyIdentity.generate();
  const chain = await DelegationChain.create(
    root,
    session.getPublicKey(),
    new Date(Date.now() + expiresInMs),
  );

  return DelegationIdentity.fromDelegation(session, chain);
};

const expirationMs = (identity: DelegationIdentity): number =>
  Number(identity.getDelegation().delegations[0].delegation.expiration / 1_000_000n);

const mockAuthClient = (identity?: Identity) => {
  const client = {
    identity: identity ?? new AnonymousIdentity(),
    isAuthenticated: vi.fn(async () => identity !== undefined),
    getIdentity: vi.fn(() => client.identity),
    login: vi.fn<(options: AuthClientLoginOptions) => Promise<void>>(async () => undefined),
    logout: vi.fn(async () => undefined),
  };

  createAuthClient.mockResolvedValueOnce(client);
  return client;
};

const loadModule = () => import('./internetIdentity');

const ONE_HOUR_MS = 60 * 60 * 1_000;

describe('internetIdentity', () => {
  beforeEach(() => {
    vi.resetModules();
    createAuthClient.mockReset();
    syncTime.mockClear();
    getTimeDiffMsecs.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores a stored session.', async () => {
    const identity = await delegationIdentity(ONE_HOUR_MS);
    mockAuthClient(identity);
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBe(identity);
    expect(auth.getAuthState()).toEqual({
      status: 'authenticated',
      identity,
      sessionEndsAtMs: expirationMs(identity) - 10_000,
    });
  });

  it('resolves without an identity when there is no stored session.', async () => {
    mockAuthClient();
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
  });

  it('creates one auth client for all callers.', async () => {
    mockAuthClient();
    const auth = await loadModule();

    auth.subscribeAuthState(() => undefined);
    await Promise.all([auth.ensureInitialized(), auth.ensureInitialized()]);

    expect(createAuthClient).toHaveBeenCalledTimes(1);
  });

  it('rejects when the auth client cannot be created.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createAuthClient.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).rejects.toThrow('IndexedDB unavailable');
  });

  it('logs in with a one-hour session.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    expect(auth.getAuthState().status).toBe('logging-in');

    const options = client.login.mock.calls[0][0];
    expect(options.maxTimeToLive).toBe(60n * 60n * 1_000_000_000n);

    const identity = await delegationIdentity(ONE_HOUR_MS);
    client.identity = identity;
    (options.onSuccess as () => void)();

    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity });
    await expect(auth.ensureInitialized()).resolves.toBe(identity);
  });

  it('allows a new login after a failed one.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    client.login.mock.calls[0][0].onError?.('UserInterrupt');
    expect(auth.getAuthState()).toEqual({ status: 'idle' });

    auth.login();
    expect(client.login).toHaveBeenCalledTimes(2);
  });

  it('clears the identity at once on logout, then logs in with a new auth client.', async () => {
    const identity = await delegationIdentity(ONE_HOUR_MS);
    const client = mockAuthClient(identity);
    const nextClient = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    const listener = vi.fn();
    auth.subscribeAuthState(listener);
    auth.logout();

    expect(auth.getAuthState()).toEqual({ status: 'logging-out' });
    auth.login();
    expect(auth.getAuthState()).toEqual({ status: 'logging-out' });

    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));
    expect(client.logout).toHaveBeenCalled();
    expect(listener).toHaveBeenCalled();
    await expect(auth.ensureInitialized()).resolves.toBeUndefined();

    auth.login();
    expect(client.login).not.toHaveBeenCalled();
    expect(nextClient.login).toHaveBeenCalled();
  });

  it('creates a new auth client even when the logout fails.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const identity = await delegationIdentity(ONE_HOUR_MS);
    const client = mockAuthClient(identity);
    client.logout.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const nextClient = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.logout();
    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));

    auth.login();
    expect(client.login).not.toHaveBeenCalled();
    expect(nextClient.login).toHaveBeenCalled();
  });

  it('ends a session that is past its end when the timer has not run yet.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

    const identity = await delegationIdentity(ONE_HOUR_MS);
    const client = mockAuthClient(identity);
    mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    vi.setSystemTime(Date.now() + ONE_HOUR_MS - 10_000);

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));
    expect(client.logout).toHaveBeenCalled();
  });

  it('ends the session 10 seconds before the delegation expires by the IC clock.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    // The IC clock runs 5 seconds ahead of the local one.
    getTimeDiffMsecs.mockReturnValue(5_000);

    const identity = await delegationIdentity(ONE_HOUR_MS);
    const client = mockAuthClient(identity);
    mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();
    // Lets the clock sync finish and move the expiry timer.
    await vi.advanceTimersByTimeAsync(0);
    expect(syncTime).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    expect(auth.getAuthState().sessionEndsAtMs).toBe(expirationMs(identity) - 15_000);

    await vi.advanceTimersByTimeAsync(ONE_HOUR_MS - 15_001);
    expect(client.logout).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(client.logout).toHaveBeenCalled();
    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));
  });
});
