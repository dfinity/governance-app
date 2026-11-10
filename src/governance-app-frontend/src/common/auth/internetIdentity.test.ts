import type {
  AuthClientCreateOptions,
  AuthClientSignInOptions,
  SessionStatus,
} from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { II_AUTHORIZE_URL, NETWORK } from '@constants/extra';

const {
  AuthClient,
  MemoryCredentialStorage,
  MemoryStateStorage,
  SupersededError,
  syncTime,
  getTimeDiffMsecs,
  reloadPage,
} = vi.hoisted(() => ({
  AuthClient: vi.fn(),
  MemoryCredentialStorage: class MemoryCredentialStorage {},
  MemoryStateStorage: class MemoryStateStorage {},
  SupersededError: class SupersededError extends Error {},
  syncTime: vi.fn(async () => undefined),
  getTimeDiffMsecs: vi.fn(() => 0),
  reloadPage: vi.fn(),
}));

const { errorNotification } = vi.hoisted(() => ({ errorNotification: vi.fn() }));

vi.mock('@utils/page', () => ({ reloadPage }));

vi.mock('@utils/notification', () => ({ errorNotification }));

vi.mock('@icp-sdk/auth/client', () => ({
  AuthClient,
  MemoryCredentialStorage,
  MemoryStateStorage,
  SupersededError,
}));

// The browser denies `localStorage`, as Chrome does when the user blocks site data.
const denyLocalStorage = () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    },
  });

  return () => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
};

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
    dispose: vi.fn(),
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

/** A fake IndexedDB with the auth client database. `open` settles when a test says so. */
const mockIndexedDB = ({ exists = true }: { exists?: boolean } = {}) => {
  const deleted: string[] = [];
  const db = {
    objectStoreNames: { contains: (name: string) => name === 'ic-keyval' },
    transaction: vi.fn(() => ({
      objectStore: () => ({ delete: (key: string) => deleted.push(key) }),
    })),
    close: vi.fn(),
  };
  const request = {
    result: db,
    transaction: { abort: vi.fn() },
    onupgradeneeded: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onsuccess: null as (() => void) | null,
  };
  const open = vi.fn(() => request);
  vi.stubGlobal('indexedDB', { open });

  const settle = () => {
    // The browser creates a database that does not exist, and the abort undoes that.
    if (!exists) {
      request.onupgradeneeded?.();
      request.onerror?.();
      return;
    }
    request.onsuccess?.();
  };

  return { deleted, db, request, open, settle };
};

const loadModule = () => import('./internetIdentity');

describe('internetIdentity', () => {
  beforeEach(() => {
    vi.resetModules();
    AuthClient.mockReset();
    errorNotification.mockClear();
    reloadPage.mockClear();
    syncTime.mockClear();
    getTimeDiffMsecs.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    expect(options.stateStorage).toBeUndefined();
    expect(options.credentialStorage).toBeUndefined();
  });

  it('keeps the session record and the credential in memory when the browser denies localStorage.', async () => {
    const restore = denyLocalStorage();

    try {
      mockAuthClient();
      const auth = await loadModule();

      await expect(auth.ensureInitialized()).resolves.toBeUndefined();
      const options: AuthClientCreateOptions = AuthClient.mock.calls[0][0];
      expect(options.stateStorage).toBeInstanceOf(MemoryStateStorage);
      expect(options.credentialStorage).toBeInstanceOf(MemoryCredentialStorage);
    } finally {
      restore();
    }
  });

  it('refuses the login when the browser denies localStorage.', async () => {
    const restore = denyLocalStorage();

    try {
      const client = mockAuthClient();
      const auth = await loadModule();
      await auth.ensureInitialized();

      auth.login();

      expect(errorNotification).toHaveBeenCalledTimes(1);
      expect(client.signIn).not.toHaveBeenCalled();
      expect(auth.getAuthState()).toEqual({ status: 'idle' });
    } finally {
      restore();
    }
  });

  it('resolves without an identity when there is no stored session.', async () => {
    mockAuthClient();
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
  });

  it('reads the stored session with a new auth client when the first one cannot hand it out.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity, expiresAtMs });
    client.getIdentity.mockRejectedValueOnce(new Error('SessionNotHeldError'));
    const nextClient = mockAuthClient({ identity, expiresAtMs });
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBe(identity);
    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity });
    expect(client.dispose).toHaveBeenCalled();
    expect(nextClient.subscribe).toHaveBeenCalled();
  });

  it('resolves without an identity when no auth client can read the stored session.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity, expiresAtMs });
    client.getIdentity.mockRejectedValueOnce(new Error('Failed to mint'));
    const nextClient = mockAuthClient({ identity, expiresAtMs });
    nextClient.getIdentity.mockRejectedValueOnce(new Error('Failed to mint'));
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle' });
    // One new client for the session, not one for each failed read.
    expect(AuthClient).toHaveBeenCalledTimes(2);
  });

  it('follows a login in another tab that the client skipped during a failed login.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = mockAuthClient();
    const signIn = deferred<Identity>();
    client.signIn.mockReturnValueOnce(signIn.promise);
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    // The other tab logs in while the popup is open. The client skips the restore during its
    // own sign-in, so it holds no identity for the session that the record names.
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    client.change(identity, signedIn(identity, expiresAtMs));
    client.getIdentity.mockRejectedValueOnce(new Error('SessionNotHeldError'));
    const nextClient = mockAuthClient({ identity, expiresAtMs });

    // The user closes the popup.
    signIn.reject(new Error('UserInterrupt'));
    await vi.waitFor(() =>
      expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity }),
    );
    expect(client.dispose).toHaveBeenCalled();
    expect(nextClient.signIn).not.toHaveBeenCalled();
  });

  it('ends a held session without a reason when the client cannot hand it out.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const identity = Ed25519KeyIdentity.generate();
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity, expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();

    // The other tab logs in again as the same account.
    const renewed = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    const renewedExpiresAtMs = expiresAtMs + ONE_HOUR_MS;
    client.getIdentity.mockRejectedValueOnce(new Error('SessionNotHeldError'));
    const nextClient = mockAuthClient({ identity: renewed, expiresAtMs: renewedExpiresAtMs });
    nextClient.getIdentity.mockRejectedValueOnce(new Error('SessionNotHeldError'));
    client.change(renewed, signedIn(renewed, renewedExpiresAtMs));

    // Not an expiry: Internet Identity still holds the session.
    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));
  });

  it('removes the session of the previous auth client version at startup.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const idb = mockIndexedDB();
    const auth = await loadModule();

    // The first read does not wait for the cleanup.
    await expect(auth.ensureInitialized()).resolves.toBe(identity);
    expect(idb.open).toHaveBeenCalledWith('auth-client-db');
    expect(idb.deleted).toEqual([]);

    idb.settle();
    expect(idb.db.transaction).toHaveBeenCalledWith('ic-keyval', 'readwrite');
    expect(idb.deleted).toEqual(['identity', 'delegation', 'iv']);
    expect(idb.db.close).toHaveBeenCalled();
  });

  it('leaves the auth client database to the auth client when there is none.', async () => {
    mockAuthClient();
    const idb = mockIndexedDB({ exists: false });
    const auth = await loadModule();
    await auth.ensureInitialized();

    idb.settle();
    expect(idb.request.transaction.abort).toHaveBeenCalled();
    expect(idb.db.transaction).not.toHaveBeenCalled();
  });

  it('reads the stored session when the cleanup of the previous version fails.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const idb = mockIndexedDB();
    idb.open.mockImplementationOnce(() => {
      throw new Error('IndexedDB unavailable');
    });
    const auth = await loadModule();

    await expect(auth.ensureInitialized()).resolves.toBe(identity);
  });

  it('closes the auth client database when the cleanup of the previous version fails.', async () => {
    mockAuthClient();
    const idb = mockIndexedDB();
    idb.db.transaction.mockImplementationOnce(() => {
      throw new Error('Transaction failed');
    });
    const auth = await loadModule();
    await auth.ensureInitialized();

    idb.settle();
    expect(idb.db.close).toHaveBeenCalled();
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

  it('starts the login again on a second click, on a new auth client.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    // The first popup closed before it loaded, so its sign-in waits.
    auth.login();
    const nextClient = mockAuthClient();
    auth.login();

    expect(client.dispose).toHaveBeenCalled();
    expect(nextClient.signIn).toHaveBeenCalledTimes(1);
    expect(nextClient.subscribe).toHaveBeenCalled();
    expect(auth.getAuthState()).toEqual({ status: 'logging-in' });
  });

  it('ignores the end of a login that a second click replaced.', async () => {
    const client = mockAuthClient();
    const firstSignIn = deferred<Identity>();
    client.signIn.mockReturnValueOnce(firstSignIn.promise);
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    const nextClient = mockAuthClient();
    const identity = Ed25519KeyIdentity.generate();
    nextClient.signIn.mockImplementationOnce(async () => {
      nextClient.identity = identity;
      nextClient.status = signedIn(identity, Date.now() + ONE_HOUR_MS);
      return identity;
    });
    auth.login();
    await vi.waitFor(() => expect(auth.getAuthState()).toMatchObject({ identity }));

    // The replaced sign-in ends late, and its client still names another account.
    const replaced = Ed25519KeyIdentity.generate();
    client.identity = replaced;
    client.status = signedIn(replaced, Date.now() + ONE_HOUR_MS);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleError.mockClear();
    firstSignIn.reject(new SupersededError('This client was disposed while signing in'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(client.getIdentity).not.toHaveBeenCalled();
    expect(auth.getAuthState()).toMatchObject({ status: 'authenticated', identity });
    // The expected end of the replaced sign-in.
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ignores the read of a sign-in that a second click replaced.', async () => {
    const client = mockAuthClient();
    const auth = await loadModule();
    await auth.ensureInitialized();

    // The first sign-in ends, and the read of its session waits.
    const replaced = Ed25519KeyIdentity.generate();
    client.signIn.mockImplementationOnce(async () => {
      client.identity = replaced;
      client.status = signedIn(replaced, Date.now() + ONE_HOUR_MS);
      return replaced;
    });
    const staleRead = deferred<Identity>();
    client.getIdentity.mockReturnValueOnce(staleRead.promise);
    auth.login();
    await vi.waitFor(() => expect(client.getIdentity).toHaveBeenCalled());

    const nextClient = mockAuthClient();
    auth.login();
    staleRead.resolve(replaced);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(nextClient.signIn).toHaveBeenCalledTimes(1);
    expect(auth.getAuthState()).toEqual({ status: 'logging-in' });
  });

  it('allows a new login after a failed one.', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = mockAuthClient();
    const failure = new Error('UserInterrupt');
    client.signIn.mockRejectedValueOnce(failure);
    const auth = await loadModule();
    await auth.ensureInitialized();

    auth.login();
    await vi.waitFor(() => expect(auth.getAuthState()).toEqual({ status: 'idle' }));
    expect(consoleError).toHaveBeenCalledWith('Internet Identity: failed to log in.', failure);

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

    // The auth client clears the session before it raises a failed revoke. Here the clear fails
    // too, so the client still holds the session.
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

  it('stays logged out after the expiry and a cancelled login.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity: Ed25519KeyIdentity.generate(), expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.advanceTimersByTimeAsync(0);

    // The session ends 10 seconds before the auth client lets it go.
    await vi.advanceTimersByTimeAsync(ONE_HOUR_MS - 10_000);
    expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'expiry' });

    client.signIn.mockRejectedValueOnce(new Error('UserInterrupt'));
    auth.login();
    await vi.advanceTimersByTimeAsync(0);

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

  it('reads a logout from another tab when the late expiry check runs.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const expiresAtMs = Date.now() + ONE_HOUR_MS;
    const client = mockAuthClient({ identity: Ed25519KeyIdentity.generate(), expiresAtMs });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.advanceTimersByTimeAsync(0);

    // Another tab logged out, and this tab has not heard of it yet.
    client.identity = undefined;
    client.status = { state: 'signed-out' };
    vi.setSystemTime(expiresAtMs);

    await expect(auth.ensureInitialized()).resolves.toBeUndefined();
    expect(auth.getAuthState()).toEqual({ status: 'idle', sessionEnd: 'logout' });
    expect(auth.consumeLogoutRedirect()).toBe(true);
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

  it('syncs the clock one time for all the sessions of a page.', async () => {
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.waitFor(() => expect(auth.getAuthState().sessionEndsAtMs).toBeDefined());

    // The same account, signed in again in another tab.
    const again = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    const expiresAtMs = Date.now() + 2 * ONE_HOUR_MS;
    client.change(again, signedIn(again, expiresAtMs));

    await vi.waitFor(() =>
      expect(auth.getAuthState()).toEqual({
        status: 'authenticated',
        identity: again,
        sessionEndsAtMs: expiresAtMs - 10_000,
      }),
    );
    expect(syncTime).toHaveBeenCalledTimes(1);
  });

  it('syncs the clock again for the next session when the sync fails.', async () => {
    syncTime.mockRejectedValueOnce(new Error('network error'));
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.waitFor(() => expect(auth.getAuthState().sessionEndsAtMs).toBeDefined());

    const again = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    client.change(again, signedIn(again, Date.now() + 2 * ONE_HOUR_MS));

    await vi.waitFor(() => expect(syncTime).toHaveBeenCalledTimes(2));
  });

  it('syncs the clock again for the next session when the local clock jumps.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.advanceTimersByTimeAsync(0);
    expect(auth.getAuthState().sessionEndsAtMs).toBeDefined();

    // The OS corrects the local clock by one minute. The monotonic clock does not move.
    vi.setSystemTime(Date.now() + 60_000);
    const again = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    client.change(again, signedIn(again, Date.now() + 2 * ONE_HOUR_MS));
    await vi.advanceTimersByTimeAsync(0);

    expect(syncTime).toHaveBeenCalledTimes(2);
  });

  it('syncs the clock again for the next session when the sync stalls.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
    syncTime.mockImplementationOnce(() => new Promise<undefined>(() => undefined));
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(auth.getAuthState().sessionEndsAtMs).toBeDefined();

    const again = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    client.change(again, signedIn(again, Date.now() + 2 * ONE_HOUR_MS));
    await vi.advanceTimersByTimeAsync(0);

    expect(syncTime).toHaveBeenCalledTimes(2);
  });

  it('keeps a newer clock sync when the older one stalls after a jump of the local clock.', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
    syncTime.mockImplementationOnce(() => new Promise<undefined>(() => undefined));
    const identity = Ed25519KeyIdentity.generate();
    const client = mockAuthClient({ identity, expiresAtMs: Date.now() + ONE_HOUR_MS });
    const auth = await loadModule();
    await auth.ensureInitialized();

    // The local clock jumps while the first sync waits, and the next session syncs again.
    vi.setSystemTime(Date.now() + 60_000);
    const again = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    client.change(again, signedIn(again, Date.now() + 2 * ONE_HOUR_MS));
    await vi.advanceTimersByTimeAsync(0);
    expect(syncTime).toHaveBeenCalledTimes(2);

    // The first sync stalls past its timeout. The second one stays.
    await vi.advanceTimersByTimeAsync(10_000);
    const once = Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey);
    client.change(once, signedIn(once, Date.now() + 3 * ONE_HOUR_MS));
    await vi.advanceTimersByTimeAsync(0);

    expect(syncTime).toHaveBeenCalledTimes(2);
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
