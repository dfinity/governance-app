import { AuthClient } from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';
import { nonNullish } from '@dfinity/utils';

import {
  II_AUTHORIZE_URL,
  II_BACKEND_CANISTER_ID,
  II_DERIVATION_ORIGIN,
  IS_LOCAL,
  NETWORK,
} from '@constants/extra';
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

export type AuthStatus = 'initializing' | 'idle' | 'logging-in' | 'authenticated' | 'logging-out';

export type SessionEnd = 'logout' | 'expiry';

export type AuthState = {
  status: AuthStatus;
  identity?: Identity;
  /** When the session ends, by the local clock. Unset until the clock sync ends. */
  sessionEndsAtMs?: number;
  /** Why the session that this tab held ended: a logout in any tab, or the end of its time. */
  sessionEnd?: SessionEnd;
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

const createAuthClient = (): AuthClient =>
  new AuthClient({
    identityProvider: { authorizeUrl: II_AUTHORIZE_URL, canisterId: II_BACKEND_CANISTER_ID },
    // For the calls that mint the delegations. A local replica needs its root key.
    agentOptions: { host: NETWORK, shouldFetchRootKey: IS_LOCAL },
    ...(nonNullish(II_DERIVATION_ORIGIN) && { derivationOrigin: II_DERIVATION_ORIGIN }),
  });

const syncedTimeDiffMs = async (): Promise<number> => {
  const agent = await getAnonymousAgent();
  await agent.syncTime();
  return agent.getTimeDiffMsecs();
};

// The session expires by the IC clock, which can drift from the local one.
const icTimeDiffMs = async (): Promise<number> => {
  if (IS_LOCAL) return 0;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<number>((resolve) => {
    timeout = setTimeout(() => resolve(0), CLOCK_SYNC_TIMEOUT_MS);
  });

  try {
    return await Promise.race([syncedTimeDiffMs(), fallback]);
  } catch {
    return 0;
  } finally {
    clearTimeout(timeout);
  }
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

  if (nonNullish(identity) && status.state === 'signed-in') {
    authenticate(identity, status.expiresAtMs);
    return;
  }

  // Only a session that this tab held can end.
  const held = state.status === 'authenticated' || state.status === 'logging-out';
  clearSession(held ? (status.state === 'signed-out' ? 'logout' : 'expiry') : undefined);
};

/**
 * Ends the session whose time is up, in this tab only: Internet Identity ends it on its own. A
 * newer session that another tab installed stays.
 */
const expireSession = async (expiresAtMs: number) => {
  const client = authClient;
  if (!client || state.status !== 'authenticated') return;

  const status = client.getStatus();
  if (status.state === 'signed-in' && status.expiresAtMs !== expiresAtMs) {
    await syncSession(client);
    return;
  }

  syncRevision++;
  clearSession('expiry');
};

// A login or a logout in this tab sets the state when it ends.
const onSessionChange = () => {
  if (authClient && ['initializing', 'idle', 'authenticated'].includes(state.status)) {
    void syncSession(authClient);
  }
};

const restoreSession = async () => {
  try {
    authClient = createAuthClient();
  } catch (err) {
    console.error('Internet Identity: failed to create the auth client.', err);
    throw err;
  }

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

/** Also starts reading the stored session, so any subscriber gets it without a route guard. */
export const subscribeAuthState = (listener: () => void): (() => void) => {
  initialize().catch(() => undefined);

  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Opens the Internet Identity popup. Call it from a user interaction, or the browser blocks it. */
export const login = () => {
  const client = authClient;
  if (!client || state.status !== 'idle') return;

  syncRevision++;
  setState({ status: 'logging-in' });

  void client
    .signIn({ maxTimeToLive: SESSION_TTL_NS })
    // A failed login syncs too, because another tab can log in meanwhile.
    .catch(() => undefined)
    .then(() => syncSession(client));
};

const endSession = async (client: AuthClient) => {
  try {
    await client.signOut();
  } catch (err) {
    // The session is cleared here even when Internet Identity cannot end it.
    console.error('Internet Identity: failed to log out.', err);
    clearSession('logout');
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

  syncRevision++;
  clearTimeout(expiryTimeout);
  setState({ status: 'logging-out' });
  void endSession(client);
};
