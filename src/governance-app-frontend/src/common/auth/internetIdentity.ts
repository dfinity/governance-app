import { AuthClient, SupersededError } from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';
import { nonNullish } from '@dfinity/utils';

import {
  II_AUTHORIZE_URL,
  II_BACKEND_CANISTER_ID,
  II_DERIVATION_ORIGIN,
  IS_LOCAL,
  NETWORK,
} from '@constants/extra';
import { reloadPage } from '@utils/page';
import { getAnonymousAgent } from '@common/canisters/agents';

/**
 * The Internet Identity session, kept outside React so route guards and loaders can read it
 * before anything mounts. Components read it through `useInternetIdentity`.
 */

// Bounds the session at Internet Identity. The auth client rotates the delegation inside it.
const SESSION_TTL_NS = 60n * 60n * 1_000_000_000n; // 1 hour
// Ends the session before it expires, so no call goes out with an expired delegation.
const EXPIRY_BUFFER_MS = 10_000;
// `setTimeout` fires at once for a longer delay. A local clock far behind the IC can ask for one
// when the clock sync fails.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
// After this, the session ends by the local clock.
const CLOCK_SYNC_TIMEOUT_MS = 10_000;
// A larger jump of the local clock since the sync makes the clock offset stale.
const CLOCK_JUMP_MS = 1_000;
// Where `@icp-sdk/auth` 5 and the versions before it kept the session. Version 10 keeps its own
// in the same store, under other keys.
const AUTH_DB_NAME = 'auth-client-db';
const AUTH_STORE_NAME = 'ic-keyval';
const LEGACY_SESSION_KEYS = ['identity', 'delegation', 'iv'];

export type AuthStatus = 'initializing' | 'idle' | 'logging-in' | 'authenticated' | 'logging-out';

export type SessionEnd = 'logout' | 'expiry';

export type AuthState = {
  status: AuthStatus;
  identity?: Identity;
  /** When the session ends, by the local clock. Unset until the clock sync ends. */
  sessionEndsAtMs?: number;
  /** Why the session that this tab held ended: a logout in any tab, or the end of its time. */
  sessionEnd?: SessionEnd;
  /** Internet Identity answered the login, so only the first delegation is left. */
  iiAnswered?: boolean;
};

let state: AuthState = { status: 'initializing' };
const listeners = new Set<() => void>();

const setState = (next: AuthState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

// `login` must open the popup inside the click handler, so the client is created ahead of it.
let authClient: AuthClient | undefined;
let initialization: Promise<void> | undefined;
let expiryTimeout: ReturnType<typeof setTimeout> | undefined;
// Tells the session of the current identity apart from a newer one that another tab installs.
let sessionExpiresAtMs: number | undefined;
// Set when a logout ends the session, for the route guard that runs on that change.
let logoutRedirectPending = false;
// A session that ended in this tab while the auth client can still hold it: a logout that failed,
// or the last seconds before the expiry.
let endedSessionExpiresAtMs: number | undefined;
// A session that the auth client could not hand out, so a new client read it one time.
let unreadableExpiresAtMs: number | undefined;

// During a login, the agent of the auth client makes its first call after Internet Identity answers.
const fetchForAuthClient: typeof fetch = (...args) => {
  if (state.status === 'logging-in' && !state.iiAnswered) setState({ ...state, iiAnswered: true });
  return fetch(...args);
};

const createAuthClient = (): AuthClient =>
  new AuthClient({
    identityProvider: { authorizeUrl: II_AUTHORIZE_URL, canisterId: II_BACKEND_CANISTER_ID },
    // For the calls that mint the delegations. A local replica needs its root key.
    agentOptions: { host: NETWORK, shouldFetchRootKey: IS_LOCAL, fetch: fetchForAuthClient },
    ...(nonNullish(II_DERIVATION_ORIGIN) && { derivationOrigin: II_DERIVATION_ORIGIN }),
  });

const syncedTimeDiffMs = async (): Promise<number> => {
  const agent = await getAnonymousAgent();
  await agent.syncTime();
  return agent.getTimeDiffMsecs();
};

// The clock offset, synced one time per page, so each later session gets its end at once. The
// clocks at the sync tell a later jump of the local clock, for example a correction after a sleep.
type ClockSync = { offset: Promise<number>; wallMs: number; monotonicMs: number };

let clockSync: ClockSync | undefined;

const localClockJumped = ({ wallMs, monotonicMs }: ClockSync): boolean =>
  Math.abs(Date.now() - wallMs - (performance.now() - monotonicMs)) > CLOCK_JUMP_MS;

// Resolves with `undefined` when the sync fails or stalls.
const syncClock = async (): Promise<number | undefined> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<undefined>((resolve) => {
    timeout = setTimeout(() => resolve(undefined), CLOCK_SYNC_TIMEOUT_MS);
  });

  try {
    return await Promise.race([syncedTimeDiffMs(), fallback]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
};

const startClockSync = (): ClockSync => {
  const sync: ClockSync = {
    wallMs: Date.now(),
    monotonicMs: performance.now(),
    offset: syncClock().then((timeDiffMs) => {
      if (nonNullish(timeDiffMs)) return timeDiffMs;

      // The local clock bounds the session, and the next session syncs the clock again. A newer
      // sync that a clock jump started stays.
      if (clockSync === sync) clockSync = undefined;
      return 0;
    }),
  };

  return sync;
};

// The session expires by the IC clock, which can drift from the local one.
const icTimeDiffMs = (): Promise<number> => {
  if (IS_LOCAL) return Promise.resolve(0);

  if (clockSync && localClockJumped(clockSync)) clockSync = undefined;
  clockSync ??= startClockSync();
  return clockSync.offset;
};

const startSession = (identity: Identity, expiresAtMs: number, timeDiffMs: number) => {
  clearTimeout(expiryTimeout);

  const sessionEndsAtMs = expiresAtMs - timeDiffMs - EXPIRY_BUFFER_MS;
  setState({ status: 'authenticated', identity, sessionEndsAtMs });

  const delayMs = Math.min(Math.max(0, sessionEndsAtMs - Date.now()), MAX_TIMEOUT_MS);
  expiryTimeout = setTimeout(() => void expireSession(expiresAtMs), delayMs);
};

const authenticate = (identity: Identity, expiresAtMs: number) => {
  clearTimeout(expiryTimeout);
  sessionExpiresAtMs = expiresAtMs;
  logoutRedirectPending = false;
  setState({ status: 'authenticated', identity });

  void icTimeDiffMs().then((timeDiffMs) => {
    // A logout or another login replaced the session while the clock synced.
    if (state.identity === identity) startSession(identity, expiresAtMs, timeDiffMs);
  });
};

const clearSession = (sessionEnd?: SessionEnd) => {
  clearTimeout(expiryTimeout);
  sessionExpiresAtMs = undefined;
  setState({ status: 'idle', ...(nonNullish(sessionEnd) && { sessionEnd }) });
};

// Only the latest session read sets the state. A login or a logout also makes older reads stale.
let syncRevision = 0;
// Resolves when the latest read has set the state, even while an older read still waits.
let sessionSettled: Promise<void> = Promise.resolve();
let settleSession: (() => void) | undefined;

// A login, a logout or an expiry decides the state, so older reads no longer count.
const supersedeReads = () => {
  syncRevision++;
  settleSession?.();
  settleSession = undefined;
};

/** Sets the state from the session that the auth client holds. */
const syncSession = (client: AuthClient): Promise<void> => {
  const revision = ++syncRevision;
  if (!settleSession) sessionSettled = new Promise((resolve) => (settleSession = resolve));

  const settle = () => {
    if (revision !== syncRevision) return;
    settleSession?.();
    settleSession = undefined;
  };
  void readSession(client, revision).then(settle, settle);

  return sessionSettled;
};

const isOtherAccount = (identity: Identity): boolean =>
  state.status === 'authenticated' &&
  nonNullish(state.identity) &&
  state.identity.getPrincipal().toText() !== identity.getPrincipal().toText();

const readSession = async (client: AuthClient, revision: number) => {
  let identity: Identity | undefined;

  try {
    if (client.isAuthenticated()) identity = await client.getIdentity();
  } catch (err) {
    console.error('Internet Identity: failed to read the session.', err);
  }

  if (revision !== syncRevision) return;

  // Read after the wait, because another tab can log in or out meanwhile.
  const status = client.getStatus();
  const live = status.state === 'signed-in' && status.expiresAtMs !== endedSessionExpiresAtMs;

  if (live && nonNullish(identity)) {
    // Another tab switched the account. A new page drops all the state of the account before:
    // agents, queries and open dialogs.
    if (isOtherAccount(identity)) {
      reloadPage();
      return;
    }

    authenticate(identity, status.expiresAtMs);
    return;
  }

  // The client holds no identity for the session that the record names: it skips the restore
  // for a change that arrives during its own sign-in or restore. A new client reads the stored
  // session. One time, so a session that cannot be read does not start a new client again.
  if (live && status.expiresAtMs !== unreadableExpiresAtMs) {
    unreadableExpiresAtMs = status.expiresAtMs;
    void syncSession(replaceAuthClient());
    return;
  }

  // Only a session that this tab held can end, and only one that Internet Identity no longer
  // holds has a reason: a logout, or the end of its time.
  const held = state.status === 'authenticated' || state.status === 'logging-out';
  const sessionEnd = !held
    ? undefined
    : status.state === 'signed-out'
      ? 'logout'
      : status.state === 'expired'
        ? 'expiry'
        : undefined;
  // A logout in this tab set it already.
  if (state.status === 'authenticated' && sessionEnd === 'logout') logoutRedirectPending = true;
  clearSession(sessionEnd);
};

/**
 * Ends the session that this tab held, even when the auth client still holds it. A newer session
 * that another tab installed is read instead.
 */
const endHeldSession = async (
  client: AuthClient,
  expiresAtMs: number | undefined,
  sessionEnd: SessionEnd,
) => {
  const status = client.getStatus();
  if (status.state === 'signed-in' && status.expiresAtMs !== expiresAtMs) {
    await syncSession(client);
    return;
  }

  // A read that still waits must not start the ended session again.
  supersedeReads();
  endedSessionExpiresAtMs = expiresAtMs;
  clearSession(sessionEnd);
};

/**
 * Ends the session whose time is up, in this tab only: Internet Identity ends it on its own. A
 * logout that another tab made is read instead, for its reason.
 */
const expireSession = async (expiresAtMs: number) => {
  const client = authClient;
  if (!client || state.status !== 'authenticated') return;

  if (client.getStatus().state !== 'signed-in') {
    await syncSession(client);
    return;
  }

  await endHeldSession(client, expiresAtMs, 'expiry');
};

// A login or a logout in this tab sets the state when it ends.
const onSessionChange = () => {
  // A waiting read is stale once the session changes, also the read after a login or a logout.
  const reading = nonNullish(settleSession);
  if (authClient && (reading || ['initializing', 'idle', 'authenticated'].includes(state.status))) {
    void syncSession(authClient);
  }
};

// The client gives way to a new one: it waits for a popup that closed before it loaded, or it
// holds no identity for the session that the record names. Disposal ends what the client hooked,
// not the session.
const replaceAuthClient = (): AuthClient => {
  authClient?.dispose();
  authClient = createAuthClient();
  authClient.subscribe(onSessionChange);
  return authClient;
};

// Removes the session of `@icp-sdk/auth` 5, which the upgrade left in the store that version 10
// shares. It never throws, and the first session read does not wait for it.
const removeLegacySession = () => {
  try {
    const request = indexedDB.open(AUTH_DB_NAME);
    // The database does not exist, so the open creates it. An abort undoes that, and the auth
    // client creates the database with its own store.
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onerror = () => undefined;
    request.onsuccess = () => {
      const db = request.result;
      try {
        if (db.objectStoreNames.contains(AUTH_STORE_NAME)) {
          const store = db.transaction(AUTH_STORE_NAME, 'readwrite').objectStore(AUTH_STORE_NAME);
          LEGACY_SESSION_KEYS.forEach((key) => store.delete(key));
        }
      } catch {
        // The store is in use or read-only. The old session stays, and so does the new one.
      } finally {
        db.close();
      }
    };
  } catch {
    // No IndexedDB, or no access to it. The auth client reports that on its own.
  }
};

const restoreSession = async () => {
  try {
    authClient = createAuthClient();
  } catch (err) {
    console.error('Internet Identity: failed to create the auth client.', err);
    throw err;
  }

  removeLegacySession();

  // Other tabs share the session, so their logins and logouts arrive here. A change during the
  // first read starts a newer one, and the wait ends with the latest.
  authClient.subscribe(onSessionChange);
  await syncSession(authClient);
};

const initialize = (): Promise<void> => (initialization ??= restoreSession());

/**
 * Resolves once the stored session is read: with its identity, or with `undefined` when there
 * is no active session. Rejects only when the auth client cannot be created.
 */
export const ensureInitialized = async (): Promise<Identity | undefined> => {
  await initialize();
  // Another tab can have changed the session, and its read can still wait.
  await sessionSettled;

  // A background tab can run the expiry timer late.
  const { sessionEndsAtMs } = state;
  if (
    nonNullish(sessionEndsAtMs) &&
    nonNullish(sessionExpiresAtMs) &&
    Date.now() >= sessionEndsAtMs
  ) {
    await expireSession(sessionExpiresAtMs);
  }

  return state.status === 'authenticated' ? state.identity : undefined;
};

export const getAuthState = (): AuthState => state;

/**
 * Whether the route guard runs for a logout, which needs no notice. It answers `true` once.
 * `useSessionChange` drops a logout that no guard consumed, once the guards ran.
 */
export const consumeLogoutRedirect = (): boolean => {
  const pending = logoutRedirectPending;
  logoutRedirectPending = false;
  return pending;
};

/** Also starts reading the stored session, so any subscriber gets it without a route guard. */
export const subscribeAuthState = (listener: () => void): (() => void) => {
  initialize().catch(() => undefined);

  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Only the latest login sets the state, so a login that a second click replaced has no effect.
let loginAttempt = 0;

const signIn = (client: AuthClient) => {
  const attempt = ++loginAttempt;

  void client
    .signIn({ maxTimeToLive: SESSION_TTL_NS })
    .catch((err: unknown) => {
      // `login` started the sign-in again on a new client, which ends this one.
      if (err instanceof SupersededError) return;
      console.error('Internet Identity: failed to log in.', err);
    })
    // A failed login syncs too, because another tab can log in meanwhile.
    .then(() => {
      if (attempt === loginAttempt) return syncSession(client);
    });
};

/**
 * Opens the Internet Identity popup. Call it from a user interaction, or the browser blocks it.
 *
 * A second call during the login starts it again. A popup closed before it loads keeps the
 * sign-in waiting for 2 minutes (`@icp-sdk/signer` 6.0.0). A new client takes the signer channel,
 * which ends the sign-in that waits.
 */
export const login = () => {
  const client = authClient;
  if (!client) return;

  if (state.status === 'logging-in') {
    // The read after the first sign-in can still wait.
    supersedeReads();
    setState({ status: 'logging-in' });
    signIn(replaceAuthClient());
    return;
  }

  if (state.status !== 'idle') return;

  supersedeReads();
  setState({ status: 'logging-in' });
  signIn(client);
};

const endSession = async (client: AuthClient, expiresAtMs: number | undefined) => {
  try {
    await client.signOut();
  } catch (err) {
    console.error('Internet Identity: failed to log out.', err);
    // The session ends in this tab even when Internet Identity still holds it.
    await endHeldSession(client, expiresAtMs, 'logout');
    return;
  }

  // Another tab can log in while the logout runs.
  await syncSession(client);
};

/**
 * Clears the identity at once, then ends the session at Internet Identity, which logs out every
 * tab. `login` waits for `idle`, so it cannot start during the logout.
 */
export const logout = () => {
  const client = authClient;
  if (!client || state.status !== 'authenticated') return;

  const expiresAtMs = sessionExpiresAtMs;
  supersedeReads();
  clearTimeout(expiryTimeout);
  logoutRedirectPending = true;
  setState({ status: 'logging-out', sessionEnd: 'logout' });
  void endSession(client, expiresAtMs);
};
