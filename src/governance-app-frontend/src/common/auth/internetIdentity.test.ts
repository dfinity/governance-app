import type {
  AuthClientCreateOptions,
  AuthClientSignInOptions,
  SessionStatus,
} from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { II_AUTHORIZE_URL, NETWORK } from '@constants/extra';

const { AuthClient, syncTime, getTimeDiffMsecs, reloadPage } = vi.hoisted(() => ({
  AuthClient: vi.fn(),
  syncTime: vi.fn(async () => undefined),
  getTimeDiffMsecs: vi.fn(() => 0),
  reloadPage: vi.fn(),
}));

vi.mock('@utils/page', () => ({ reloadPage }));

vi.mock('@icp-sdk/auth/client', () => ({ AuthClient }));

vi.mock('@common/canisters/agents', () => ({
  getAnonymousAgent: async () => ({ syncTime, getTimeDiffMsecs }),
}));

vi.mock('@constants/extra', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@constants/extra')>()),
  IS_LOCAL: false,
}));

const ONE_HOUR_MS = 60 * 60 * 1_000;

const signedIn = (identity: Identity, expiresAtMs: number): SessionStatus => ({
  state: 'signed-in',
  principal: identity.getPrincipal(),
  expiresAtMs,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

/** A fake auth client. `change` is a login or a logout that another tab makes. */
const mockAuthClient = (session?: { identity: Identity; expiresAtMs: number }) => {
  const sessionListeners = new Set<() => void>();

  const client = {
    status: (session
      ? signedIn(session.identity, session.expiresAtMs)
      : { state: 'signed-out' }) as SessionStatus,
    identity: session?.identity,
    getStatus: vi.fn(() => client.status),
    isAuthenticated: vi.fn(() => client.status.state === 'signed-in'),
    getIdentity: vi.fn(async (): Promise<Identity> => {
      if (!client.identity) throw new Error('No identity');
      return client.identity;
    }),
    subscribe: vi.fn((listener: () => void) => {
      sessionListeners.add(listener);
      return () => sessionListeners.delete(listener);
    }),
    // Pending until a test settles it, as while the popup is open.
    signIn: vi.fn<(options?: AuthClientSignInOptions) => Promise<Identity>>(
      () => new Promise(() => undefined),
    ),
    signOut: vi.fn(async () => {
      client.identity = undefined;
      client.status = { state: 'signed-out' };
    }),
    change: (identity: Identity | undefined, status: SessionStatus) => {
      client.identity = identity;
      client.status = status;
      sessionListeners.forEach((listener) => listener());
    },
  };

  AuthClient.mockImplementationOnce(function () {
    return client;
  });

  return client;
};

const loadModule = () => import('./internetIdentity');

describe('internetIdentity', () => {
  beforeEach(() => {
    vi.resetModules();
    AuthClient.mockReset();
    reloadPage.mockClear();
    syncTime.mockClear();
    getTimeDiffMsecs.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores a stored session.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    mockAuthClient({ identity, expiresAtMs });
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBe(identity);
    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({
        status: 'authenticated',
        identity,
        sessionEndsAtMs: expiresAtMs - 10_000,
      }),
    );
  });

  it('creates the auth client for the Internet Identity canister.', async () => {
    mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    const options: AuthClientCreateOptions = AuthClient.mock.calls[0][0];
    expect(options.identityProvider).toEqual({
      authorizeUrl: II_AUTHORIZE_URL,
      canisterId: 'rdmx6-jaaaa-aaaaa-aaadq-cai',
    });
    expect(II_AUTHORIZE_URL).toMatch(/\/authorize\?/);
    expect(options.agentOptions).toEqual({ host: NETWORK, shouldFetchRootKey: false });
  });

  it('resolves without an identity when there is no stored session.', async () => {
    mockAuthClient();
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
  });

  it('resolves without an identity when the stored session cannot be read.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = mockAuthClient({
      identity: Ed25519KeyIdentity.generate(),
      expiresAtMs: Date.now() + ONE_HOUR_MS,
    });
    client.getIdentity.mockRejectedValueOnce(new Error('Failed to mint'));
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
  });

  it('creates one auth client for all callers.', async () => {
    mockAuthClient();
    const auth = await loadModule();

    auth.subscribeAuthState(() => undefined);
    await Promise.all([auth.ensureInitialized(), auth.ensureInitialized()]);

    expect(AuthClient).toHaveBeenCalledTimes(1);
  });

  it('rejects when the auth client cannot be created.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    AuthClient.mockImplementationOnce(function () {
      throw new Error('IndexedDB unavailable');
    });
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).rejects.toThrow('IndexedDB unavailable');
  });

  it('logs in with a one-hour session.', async () => {
    const client = mockAuthClient();
    const signIn = deferred<Identity>();
    client.signIn.mockReturnValueOnce(signIn.promise);
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    expect(auth.getAuthState().status).toBe('logging-in');
    expect(client.signIn).toHaveBeenCalledWith({ maxTimeToLive: 60n * 60n * 1_000_000_000n });

    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    // The login writes the session before `signIn` resolves.
    client.change(identity, signedIn(identity, expiresAtMs));
    expect(auth.getAuthState().status).toBe('logging-in');

    signIn.resolve(identity);
    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({
        status: 'authenticated',
        identity,
        sessionEndsAtMs: expiresAtMs - 10_000,
      }),
    );
    await expect(auth.ensureInitialized()).resolves.toBe(identity);
  });

  it('allows a new login after a failed one.', async () => {
    const client = mockAuthClient();
    client.signIn.mockRejectedValueOnce(new Error('UserInterrupt'));
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));

    auth.login();
    expect(client.signIn).toHaveBeenCalledTimes(2);
  });

  it('follows a login and a logout in another tab.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    const identity = Ed25519KeyIdentity.generate();
    client.change(identity, signedIn(identity, Date.now() + ONE_HOUR_MS));
    await vi.waitFor(() => expect(auth.getAuthState()).toMatchObject({ identity }));

    client.change(undefined, { state: 'signed-out' });
    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'logout' }),
    );
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('restores the newer session when another tab changes it during the first read.', async () => {
    const older = Ed25519KeyIdentity.generate();
    const newer = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity: older, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const olderRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(olderRead.promise);
    const auth = await loadModule();

    const restored = auth.ensureInitialized();
    await vi.waitFor(() => expect(client.getIdentity).toHaveBeenCalled());
    client.change(newer, signedIn(newer, Date.now() + 2 * ONE_HOUR_MS));

    olderRead.resolve(older);
    await expect(restored).resolves.toBe(newer);
    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: newer });
  });

  it('restores the newer session when the first read fails after another tab changes it.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const older = Ed25519KeyIdentity.generate();
    const newer = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity: older, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const olderRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(olderRead.promise);
    const auth = await loadModule();

    const restored = auth.ensureInitialized();
    await vi.waitFor(() => expect(client.getIdentity).toHaveBeenCalled());
    client.change(newer, signedIn(newer, Date.now() + ONE_HOUR_MS));

    olderRead.reject(new Error('IndexedDB closed'));
    await expect(restored).resolves.toBe(newer);
    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: newer });
  });

  it('keeps the newer session when an older session read resolves last.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    const older = Ed25519KeyIdentity.generate();
    const newer = Ed25519KeyIdentity.generate();
    const olderRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(olderRead.promise);

    client.change(older, signedIn(older, Date.now() + ONE_HOUR_MS));
    client.change(newer, signedIn(newer, Date.now() + 2 * ONE_HOUR_MS));
    await vi.waitFor(() => expect(auth.getAuthState()).toMatchObject({ identity: newer }));

    olderRead.resolve(older);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: newer });
  });

  it('keeps the newer session when an older session read fails last.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    const older = Ed25519KeyIdentity.generate();
    const newer = Ed25519KeyIdentity.generate();
    const olderRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(olderRead.promise);

    client.change(older, signedIn(older, Date.now() + ONE_HOUR_MS));
    client.change(newer, signedIn(newer, Date.now() + ONE_HOUR_MS));
    await vi.waitFor(() => expect(auth.getAuthState()).toMatchObject({ identity: newer }));

    olderRead.reject(new Error('IndexedDB closed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: newer });
  });

  it('ignores a session read that started before a logout.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.waitFor(() => expect(auth.getAuthState().sessionEndsAtMs).toBeDefined());

    const staleRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(staleRead.promise);
    client.change(identity, signedIn(identity, Date.now() + ONE_HOUR_MS));

    // Internet Identity has not ended the session yet.
    const signOut = deferred<void>();
    client.signOut.mockImplementationOnce(async () => {
      await signOut.promise;
      client.identity = undefined;
      client.status = { state: 'signed-out' };
    });
    auth.logout();

    staleRead.resolve(identity);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(auth.getAuthState()).toEqual({ status: 'logging-out', sessionEnd: 'logout' });

    signOut.resolve();
    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'logout' }),
    );
  });

  it('keeps a login from another tab that arrives during the logout.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    const signOut = deferred<void>();
    client.signOut.mockImplementationOnce(async () => {
      client.identity = undefined;
      client.status = { state: 'signed-out' };
      await signOut.promise;
    });
    auth.logout();

    const other = Ed25519KeyIdentity.generate();
    client.change(other, signedIn(other, Date.now() + ONE_HOUR_MS));
    signOut.resolve();

    await vi.waitFor(() =>
      expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: other }),
    );
  });

  it('ends startup with the latest session while an older read still waits.', async () => {
    const older = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity: older, expiresAtMs: Date.now() + ONE_HOUR_MS });
    // Never settles, as a stalled mint.
    client.getIdentity.mockReturnValueOnce(new Promise<Identity>(() => undefined));
    const auth = await loadModule();

    const restored = auth.ensureInitialized();
    await vi.waitFor(() => expect(client.getIdentity).toHaveBeenCalled());
    client.change(undefined, { state: 'signed-out' });

    await expect(restored).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
  });

  it('gives the logout to one route guard.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();
    expect(auth.consumeLogoutRedirect()).toBe(false);

    auth.logout();
    await vi.waitFor(() => expect(auth.getAuthState().status).toBe('idle'));

    expect(auth.consumeLogoutRedirect()).toBe(true);
    expect(auth.consumeLogoutRedirect()).toBe(false);
  });

  it('gives a logout from another tab to one route guard.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    client.change(undefined, { state: 'signed-out' });
    await vi.waitFor(() => expect(auth.getAuthState().status).toBe('idle'));

    expect(auth.consumeLogoutRedirect()).toBe(true);
    expect(auth.consumeLogoutRedirect()).toBe(false);
  });

  it('waits for a session change from another tab before it returns the identity.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    // The same account, signed in again in another tab.
    const again = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    const againRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(againRead.promise);
    client.change(again, signedIn(again, Date.now() + 2 * ONE_HOUR_MS));

    const guard = auth.ensureInitialized();
    againRead.resolve(again);

    await expect(guard).resolves.toBe(again);
  });

  it('loads the page again when another tab switches the account.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    const other = Ed25519KeyIdentity.generate();
    client.change(other, signedIn(other, Date.now() + ONE_HOUR_MS));

    await vi.waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    // The other account never reaches the page that is about to load again.
    expect(auth.getAuthState()).toMatchObject({ identity });
  });

  it('reads the session again when it changes during the read after a login.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    const signedInHere = Ed25519KeyIdentity.generate();
    const signIn = deferred<Identity>();
    client.signIn.mockReturnValueOnce(signIn.promise);
    auth.login();

    const staleRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(staleRead.promise);
    client.identity = signedInHere;
    client.status = signedIn(signedInHere, Date.now() + ONE_HOUR_MS);
    signIn.resolve(signedInHere);
    await vi.waitFor(() => expect(client.getIdentity).toHaveBeenCalled());

    // Another tab signs in with another account before the read ends.
    const other = Ed25519KeyIdentity.generate();
    client.change(other, signedIn(other, Date.now() + 2 * ONE_HOUR_MS));
    staleRead.resolve(signedInHere);

    await vi.waitFor(() =>
      expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: other }),
    );
  });

  it('stays logged out after a failed logout and a cancelled login.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    // Internet Identity fails to end the session, so the client still holds it.
    client.signOut.mockRejectedValueOnce(new Error('network error'));
    auth.logout();
    await vi.waitFor(() => expect(auth.getAuthState().status).toBe('idle'));

    client.signIn.mockRejectedValueOnce(new Error('UserInterrupt'));
    auth.login();
    expect(auth.getAuthState().status).toBe('logging-in');

    // The read after the cancelled login ends the login.
    await vi.waitFor(() => expect(auth.getAuthState().status).not.toBe('logging-in'));
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
  });

  it('drops the logout redirect when a new session starts.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.logout();
    await vi.waitFor(() => expect(auth.getAuthState().status).toBe('idle'));

    // No route guard ran for the logout, for example on a page without one.
    const again = Ed25519KeyIdentity.generate();
    client.change(again, signedIn(again, Date.now() + ONE_HOUR_MS));
    await vi.waitFor(() => expect(auth.getAuthState()).toMatchObject({ identity: again }));

    expect(auth.consumeLogoutRedirect()).toBe(false);
  });

  it('keeps a login from another tab when the logout fails.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    const signOut = deferred<void>();
    client.signOut.mockReturnValueOnce(signOut.promise);
    auth.logout();

    const other = Ed25519KeyIdentity.generate();
    client.change(other, signedIn(other, Date.now() + 2 * ONE_HOUR_MS));
    signOut.reject(new Error('network error'));

    await vi.waitFor(() =>
      expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: other }),
    );
  });

  it('releases a waiting route guard on logout.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    // A read that never settles, as a stalled mint.
    client.getIdentity.mockReturnValueOnce(new Promise<Identity>(() => undefined));
    client.change(identity, signedIn(identity, Date.now() + ONE_HOUR_MS));

    const guard = auth.ensureInitialized();
    auth.logout();

    await expect(guard).resolves.toBeUndefined();
  });

  it('clears the identity at once on logout, then allows a new login.', async () => {
    const client = mockAuthClient({
      identity: Ed25519KeyIdentity.generate(),
      expiresAtMs: Date.now() + ONE_HOUR_MS,
    });
    const auth = await loadModule();
    await auth.ensureInitialized();

    const listener = vi.fn();
    auth.subscribeAuthState(listener);
    auth.logout();

    expect(auth.getAuthState()).toEqual({ status: 'logging-out', sessionEnd: 'logout' });
    auth.login();
    expect(client.signIn).not.toHaveBeenCalled();

    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'logout' }),
    );
    expect(client.signOut).toHaveBeenCalled();
    expect(listener).toHaveBeenCalled();
    await expect(auth.ensureInitialized()).resolves.toBeUndefined();

    auth.login();
    expect(client.signIn).toHaveBeenCalled();
  });

  it('allows a new login after a failed logout.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = mockAuthClient({
      identity: Ed25519KeyIdentity.generate(),
      expiresAtMs: Date.now() + ONE_HOUR_MS,
    });
    client.signOut.mockRejectedValueOnce(new Error('Failed to revoke'));
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.logout();
    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'logout' }),
    );

    auth.login();
    expect(client.signIn).toHaveBeenCalled();
  });

  it('ends a session that is past its end when the timer has not run yet.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

    const client = mockAuthClient({
      identity: Ed25519KeyIdentity.generate(),
      expiresAtMs: Date.now() + ONE_HOUR_MS,
    });
    const auth = await loadModule();
    await auth.ensureInitialized();
    // Lets the clock sync finish and set the session end.
    await vi.advanceTimersByTimeAsync(0);
    expect(auth.getAuthState().sessionEndsAtMs).toBeDefined();

    vi.setSystemTime(Date.now() + ONE_HOUR_MS - 10_000);

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'expiry' });
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('keeps a newer session from another tab when the old one expires during its read.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const older = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity: older, expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.advanceTimersByTimeAsync(0);

    // The same account, signed in again in another tab.
    const newer = Ed25519KeyIdentity.fromSecretKey(older.getKeyPair().secretKey);
    const newerRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(newerRead.promise);
    client.change(newer, signedIn(newer, expiresAtMs + ONE_HOUR_MS));

    // The old session ends while the read of the newer one waits.
    await vi.advanceTimersByTimeAsync(ONE_HOUR_MS);
    newerRead.resolve(newer);
    await vi.advanceTimersByTimeAsync(0);

    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity: newer });
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('returns a newer session from another tab when the late expiry check runs.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const older = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity: older, expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.advanceTimersByTimeAsync(0);

    // Another tab signed the same account in again, and this tab has not heard of it yet.
    const newer = Ed25519KeyIdentity.fromSecretKey(older.getKeyPair().secretKey);
    client.identity = newer;
    client.status = signedIn(newer, expiresAtMs + ONE_HOUR_MS);
    vi.setSystemTime(expiresAtMs);

    await expect(auth.ensureInitialized()).resolves.toBe(newer);
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('marks a session that expired in another tab.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity, expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();

    client.change(undefined, { state: 'expired', principal: identity.getPrincipal(), expiresAtMs });

    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'expiry' }),
    );
  });

  it('keeps a session that ends early by a fast local clock until the clock sync ends.', async () => {
    let finishSync = () => undefined as void;
    syncTime.mockImplementationOnce(
      () => new Promise<undefined>((resolve) => (finishSync = () => resolve(undefined))),
    );
    // The local clock runs 60 seconds ahead of the IC clock.
    getTimeDiffMsecs.mockReturnValue(-60_000);

    // 5 seconds left by the local clock, 55 seconds by the IC clock.
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + 5_000;
    const client = mockAuthClient({ identity, expiresAtMs });
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBe(identity);
    expect(auth.getAuthState()).toEqual({ status: 'authenticated', identity });

    finishSync();
    await vi.waitFor(() => expect(auth.getAuthState().sessionEndsAtMs).toBe(expiresAtMs + 50_000));
    await expect(auth.ensureInitialized()).resolves.toBe(identity);
    expect(client.signOut).not.toHaveBeenCalled();

    auth.logout();
  });

  it('ends the session by the local clock when the clock sync stalls.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    syncTime.mockImplementationOnce(() => new Promise<undefined>(() => undefined));

    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity: Ed25519KeyIdentity.generate(), expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();

    await vi.advanceTimersByTimeAsync(9_999);
    expect(auth.getAuthState().sessionEndsAtMs).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(auth.getAuthState().sessionEndsAtMs).toBe(expiresAtMs - 10_000);

    await vi.advanceTimersByTimeAsync(ONE_HOUR_MS);
    expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'expiry' });
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('keeps the expiry delay in the range of setTimeout when the clock sync fails.', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    syncTime.mockRejectedValueOnce(new Error('network error'));

    // 30 days left by the local clock, more than setTimeout accepts.
    const expiresAtMs = Date.now() + 30 * 24 * ONE_HOUR_MS;
    mockAuthClient({ identity: Ed25519KeyIdentity.generate(), expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.waitFor(() => expect(auth.getAuthState().sessionEndsAtMs).toBe(expiresAtMs - 10_000));

    const delays = setTimeoutSpy.mock.calls.map(([, delay]) => delay ?? 0);
    expect(Math.max(...delays)).toBe(2 ** 31 - 1);

    auth.logout();
    setTimeoutSpy.mockRestore();
  });

  it('ends the session 10 seconds before it expires by the IC clock.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    // The IC clock runs 5 seconds ahead of the local one.
    getTimeDiffMsecs.mockReturnValue(5_000);

    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity: Ed25519KeyIdentity.generate(), expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();
    // Lets the clock sync finish and move the expiry timer.
    await vi.advanceTimersByTimeAsync(0);
    expect(syncTime).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    expect(auth.getAuthState().sessionEndsAtMs).toBe(expiresAtMs - 15_000);

    await vi.advanceTimersByTimeAsync(ONE_HOUR_MS - 15_001);
    expect(auth.getAuthState().status).toBe('authenticated');

    await vi.advanceTimersByTimeAsync(1);
    expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'expiry' });
    // Internet Identity ends the session on its own, so other tabs keep a newer one.
    expect(client.signOut).not.toHaveBeenCalled();
  });
});
