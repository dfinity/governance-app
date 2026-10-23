/**
 * One call at a time per Ledger device.
 *
 * A device handles one request at a time, and the user answers each one on its screen.
 * A second call while the first waits for an answer fails on the transport. This queue
 * runs the calls to one device principal in order: a new call waits for the pending one
 * to settle, even when the UI that started it is gone.
 */
const queues = new Map<string, Promise<unknown>>();

export const runOnDevice = <T>(principal: string, call: () => Promise<T>): Promise<T> => {
  const previous = queues.get(principal) ?? Promise.resolve();
  const next = previous.then(call);
  const settled: Promise<unknown> = next.then(
    () => undefined,
    () => undefined,
  );

  queues.set(principal, settled);
  void settled.then(() => {
    if (queues.get(principal) === settled) queues.delete(principal);
  });

  return next;
};

/** True while a call to the device is pending. */
export const isDeviceBusy = (principal: string): boolean => queues.has(principal);

/** Forgets every pending call. For tests. */
export const clearDeviceQueues = (): void => {
  queues.clear();
};
