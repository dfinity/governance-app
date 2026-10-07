import { AuthClient } from '@icp-sdk/auth/client';
import type { Identity } from '@icp-sdk/core/agent';
import { DelegationIdentity, isDelegationValid } from '@icp-sdk/core/identity';
import { nonNullish } from '@dfinity/utils';

import { II_DERIVATION_ORIGIN, II_LOGIN_URL, IS_LOCAL } from '@constants/extra';
import { getAnonymousAgent } from '@common/canisters/agents';

/**
 * The Internet Identity session, kept outside React so route guards and loaders can read it
 * before anything mounts. Components read it through `useInternetIdentity`.
 */

const SESSION_TTL_NS = 60n * 60n * 1_000_000_000n; // 1 hour
// Ends the session before the delegation expires, so no call goes out with an expired one.
const EXPIRY_BUFFER_MS = 10_000;

export type AuthStatus = 'initializing' | 'idle' | 'logging-in' | 'authenticated' | 'logging-out';

export type AuthState = {
  status: AuthStatus;
  identity?: Identity;
  /** When the session ends, by the local clock. */
  sessionEndsAtMs?: number;
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

const createAuthClient = async (): Promise<AuthClient> => {
  authClient = await AuthClient.create({ idleOptions: { disableIdle: true } });
  return authClient;
};

const isActive = (identity: Identity): boolean =>
  identity instanceof DelegationIdentity && isDelegationValid(identity.getDelegation());

const delegationExpirationMs = (identity: Identity): number | undefined => {
  if (!(identity instanceof DelegationIdentity)) return undefined;

  const expirations = identity
    .getDelegation()
    .delegations.map(({ delegation }) => delegation.expiration);
  if (expirations.length === 0) return undefined;

  const earliest = expirations.reduce((min, expiration) => (expiration < min ? expiration : min));
  return Number(earliest / 1_000_000n);
};

// The delegation expires by the IC clock, which can drift from the local one.
const icTimeDiffMs = async (): Promise<number> => {
  if (IS_LOCAL) return 0;

  try {
    const agent = await getAnonymousAgent();
    await agent.syncTime();
    return agent.getTimeDiffMsecs();
  } catch {
    return 0;
  }
};

const startSession = (identity: Identity, timeDiffMs: number) => {
  clearTimeout(expiryTimeout);

  const expirationMs = delegationExpirationMs(identity);
  const sessionEndsAtMs =
    expirationMs === undefined ? undefined : expirationMs - timeDiffMs - EXPIRY_BUFFER_MS;

  setState({ status: 'authenticated', identity, sessionEndsAtMs });

  if (sessionEndsAtMs !== undefined) {
    expiryTimeout = setTimeout(logout, Math.max(0, sessionEndsAtMs - Date.now()));
  }
};

const authenticate = (identity: Identity) => {
  startSession(identity, 0);

  void icTimeDiffMs().then((timeDiffMs) => {
    // A logout or another login replaced the session while the clock synced.
    if (timeDiffMs !== 0 && state.identity === identity) startSession(identity, timeDiffMs);
  });
};

const restoreSession = async () => {
  try {
    const client = await createAuthClient();

    if (await client.isAuthenticated()) {
      authenticate(client.getIdentity());
    } else {
      setState({ status: 'idle' });
    }
  } catch (err) {
    console.error('Internet Identity: failed to restore the session.', err);
    throw err;
  }
};

const initialize = (): Promise<void> => (initialization ??= restoreSession());

/**
 * Resolves once the stored session is read: with its identity, or with `undefined` when there
 * is no active session. Rejects only when the auth client cannot be created.
 */
export const ensureInitialized = async (): Promise<Identity | undefined> => {
  await initialize();

  const { identity } = state;
  return nonNullish(identity) && isActive(identity) ? identity : undefined;
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

  setState({ status: 'logging-in' });

  void client.login({
    identityProvider: II_LOGIN_URL,
    ...(nonNullish(II_DERIVATION_ORIGIN) && { derivationOrigin: II_DERIVATION_ORIGIN }),
    maxTimeToLive: SESSION_TTL_NS,
    onSuccess: () => authenticate(client.getIdentity()),
    onError: () => setState({ status: 'idle' }),
  });
};

const endSession = async () => {
  try {
    await authClient?.logout();
    // A new client, so the next login does not reuse the session key of this one.
    await createAuthClient();
  } catch (err) {
    console.error('Internet Identity: failed to log out.', err);
  }

  setState({ status: 'idle' });
};

/** Clears the identity at once. `login` waits for `idle`, so it cannot reuse the old client. */
export const logout = () => {
  if (state.status !== 'authenticated') return;

  clearTimeout(expiryTimeout);
  setState({ status: 'logging-out' });
  void endSession();
};
