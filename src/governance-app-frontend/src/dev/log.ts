import { nonNullish } from '@dfinity/utils';

export const isNode = (): boolean =>
  typeof process !== 'undefined' && nonNullish(process.versions?.node);

/**
 *
 * console.debug with time prefix (e.g. "[15:22:55.438] Message.")
 */
export const logWithTimestamp = (...args: Array<unknown>): void => {
  if (isNode() === true) return;

  const time = `[${new Date().toISOString().split('T')[1].replace('Z', '')}]`;
  console.debug.call(console, ...[time, ...args]);
};
