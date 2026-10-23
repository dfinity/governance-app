import { LedgerDeviceError, LedgerErrorCode } from './errors';
import type { LedgerIdentity } from './ledgerIdentity';

/**
 * One `LedgerIdentity` per device principal for the browser session.
 *
 * The first call connects to the device and reads its public key. Later calls reuse the
 * identity, so the user sees one "connect" prompt per device and session. The cache holds
 * the pending promise, so two parallel calls share one device connection.
 *
 * The identity module loads through a dynamic `import()`, so the Ledger libraries stay out
 * of the main bundle until a device action starts.
 */
const identities = new Map<string, Promise<LedgerIdentity>>();

// Bumped by `clearLedgerIdentities`, so a connection that started before a logout does not
// seed the cache of the next session.
let generation = 0;

const connect = async (principal: string): Promise<LedgerIdentity> => {
  const { LedgerIdentity } = await import('./ledgerIdentity');
  const identity = await LedgerIdentity.create();

  if (identity.getPrincipal().toText() !== principal) {
    throw new LedgerDeviceError(LedgerErrorCode.UnexpectedDevice, {
      expected: principal,
      actual: identity.getPrincipal().toText(),
    });
  }

  return identity;
};

/**
 * The identity of the registered Ledger device with this principal.
 *
 * Throws `LedgerDeviceError` with `LedgerErrorCode.UnexpectedDevice` when the connected
 * device has another principal. A failed connection is not cached, so the next call
 * prompts the user again.
 */
export const getLedgerIdentity = (principal: string): Promise<LedgerIdentity> => {
  const cached = identities.get(principal);
  if (cached) return cached;

  const pending = connect(principal);
  identities.set(principal, pending);

  pending.catch(() => {
    // Only drop the entry that failed. A later call may have replaced it.
    if (identities.get(principal) === pending) identities.delete(principal);
  });

  return pending;
};

/**
 * Connects to the Ledger device the user picks and caches its identity under the device
 * principal, so a later `getLedgerIdentity(principal)` reuses the connection.
 */
export const connectLedgerIdentity = async (): Promise<LedgerIdentity> => {
  const startedIn = generation;
  const { LedgerIdentity } = await import('./ledgerIdentity');
  const identity = await LedgerIdentity.create();

  if (startedIn === generation) {
    identities.set(identity.getPrincipal().toText(), Promise.resolve(identity));
  }

  return identity;
};

/** Drops every cached identity. Call it on logout. */
export const clearLedgerIdentities = (): void => {
  generation += 1;
  identities.clear();
};
