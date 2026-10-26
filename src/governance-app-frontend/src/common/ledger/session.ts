import { clearDeviceQueues, runExclusiveDeviceCall } from './deviceQueue';
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

// Bumped on every clear. A connection started before a clear stops before it reaches the device,
// and one that already reached it does not seed the cache of the next session.
let clearGeneration = 0;

// Loaded on the first device action only, so a logout without one loads nothing.
// A failed load is forgotten, so the next action tries again.
let ledgerModule: Promise<typeof import('./ledgerIdentity')> | undefined;

const loadLedgerModule = (): Promise<typeof import('./ledgerIdentity')> =>
  (ledgerModule ??= import('./ledgerIdentity').catch((error: unknown) => {
    ledgerModule = undefined;
    throw error;
  }));

const connect = async (principal: string): Promise<LedgerIdentity> => {
  const generation = clearGeneration;
  const { LedgerIdentity } = await loadLedgerModule();
  if (generation !== clearGeneration) {
    throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
  }
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
 *
 * An aborted `signal` rejects with its reason at once. A connection that still waits for
 * the device does not start; one that already started keeps the device reservation until
 * it settles, and its late result is dropped.
 */
export const connectLedgerIdentity = (signal?: AbortSignal): Promise<LedgerIdentity> =>
  new Promise<LedgerIdentity>((resolve, reject) => {
    // The abort listener does not replay an earlier abort.
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const generation = clearGeneration;
    const onAbort = () => reject(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });

    // A pending call holds the device. A second transport on it fails, so the connection
    // reserves the device before anything else, the module load included.
    runExclusiveDeviceCall(async () => {
      signal?.throwIfAborted();
      const { LedgerIdentity } = await loadLedgerModule();
      signal?.throwIfAborted();
      if (generation !== clearGeneration) {
        throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
      }

      return LedgerIdentity.create();
    }).then(
      (identity) => {
        signal?.removeEventListener('abort', onAbort);
        if (signal?.aborted) return;

        if (generation === clearGeneration) {
          identities.set(identity.getPrincipal().toText(), Promise.resolve(identity));
        }
        resolve(identity);
      },
      (error: unknown) => {
        signal?.removeEventListener('abort', onAbort);
        if (signal?.aborted) return;

        reject(error);
      },
    );
  });

/**
 * Drops every cached identity, closes the device session, and stops the queued device
 * calls. Call it on logout. A device action that still waits for an approval loses its turn.
 */
export const clearLedgerIdentities = (): void => {
  clearGeneration += 1;
  identities.clear();
  clearDeviceQueues();

  void ledgerModule
    ?.then(({ LedgerIdentity }) => LedgerIdentity.closeSession())
    .catch((error: unknown) => console.warn('Failed to close the Ledger device session.', error));
};
