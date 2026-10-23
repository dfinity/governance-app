/**
 * One call at a time per Ledger device.
 *
 * A device handles one request at a time, and the user answers each one on its screen.
 * A second call while the first waits for an answer fails on the transport. This queue
 * runs the calls to one device principal in order: a new call waits for the pending one
 * to settle, even when the UI that started it is gone.
 */
const queues = new Map<string, Promise<unknown>>();

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

export const runOnDevice = <T>(principal: string, call: () => Promise<T>): Promise<T> => {
  const previous = queues.get(principal) ?? Promise.resolve();
  const next = Promise.all([previous, exclusive]).then(call);
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
  const next = Promise.all([exclusive, ...queues.values()]).then(call);
  const settled = settledOf(next);

  exclusive = settled;
  void settled.then(() => {
    if (exclusive === settled) exclusive = Promise.resolve();
  });

  return next;
};

/** True while a call to the device is pending. */
export const isDeviceBusy = (principal: string): boolean => queues.has(principal);

/** Forgets every pending call. For tests. */
export const clearDeviceQueues = (): void => {
  queues.clear();
  exclusive = Promise.resolve();
};
