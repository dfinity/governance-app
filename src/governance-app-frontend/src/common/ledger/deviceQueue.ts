import { LedgerDeviceError, LedgerErrorCode } from './errors';

/**
 * One call at a time per Ledger device.
 *
 * A device handles one request at a time, and the user answers each one on its screen.
 * A second call while the first waits for an answer fails on the transport. This queue
 * runs the calls to one device principal in order: a new call waits for the pending one
 * to settle, even when the UI that started it is gone.
 *
 * A call queued before a clear (logout) does not run. It rejects with `SessionClosed`
 * when its turn comes, so no device prompt asks for the previous session's action.
 */
const queues = new Map<string, Promise<unknown>>();

// Bumped on every clear. A queued call from an older generation never runs.
let clearGeneration = 0;

/**
 * The exclusive call in progress (a connection to a device whose principal is not known
 * yet). It waits for every queued call, and every call queued after it waits for it.
 */
let exclusive: Promise<unknown> = Promise.resolve();

const settledOf = (call: Promise<unknown>): Promise<unknown> =>
  call.then(
    () => undefined,
    () => undefined,
  );

const guarded = <T>(generation: number, call: () => Promise<T>): Promise<T> => {
  if (generation !== clearGeneration) {
    throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
  }

  return call();
};

export const runOnDevice = <T>(principal: string, call: () => Promise<T>): Promise<T> => {
  const generation = clearGeneration;
  const previous = queues.get(principal) ?? Promise.resolve();
  const next = Promise.all([previous, exclusive]).then(() => guarded(generation, call));
  const settled = settledOf(next);

  queues.set(principal, settled);
  void settled.then(() => {
    if (queues.get(principal) === settled) queues.delete(principal);
  });

  return next;
};

/**
 * Runs a call that needs the device alone, before its principal is known. It starts when
 * every pending call has settled, and the calls queued after it wait until it settles.
 */
export const runExclusiveDeviceCall = <T>(call: () => Promise<T>): Promise<T> => {
  const generation = clearGeneration;
  const next = Promise.all([exclusive, ...queues.values()]).then(() => guarded(generation, call));
  const settled = settledOf(next);

  exclusive = settled;
  void settled.then(() => {
    if (exclusive === settled) exclusive = Promise.resolve();
  });

  return next;
};

/**
 * The generation of the device session. `clearDeviceQueues` starts a new one, so a call that
 * waits outside the queue can compare its generation before it asks the device.
 */
export const getDeviceSessionGeneration = (): number => clearGeneration;

/** True while a call to the device is pending. */
export const isDeviceBusy = (principal: string): boolean => queues.has(principal);

/** Forgets every pending call and stops the queued ones. Call it on logout. */
export const clearDeviceQueues = (): void => {
  clearGeneration += 1;
  queues.clear();
  exclusive = Promise.resolve();
};
