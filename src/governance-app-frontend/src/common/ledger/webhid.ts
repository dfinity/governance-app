/** True when the browser exposes WebHID, which the Ledger transport needs. */
export const isWebHidSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'hid' in navigator;

/** Loads the `buffer` polyfill once. The Ledger packages read `Buffer` from the global scope. */
export const ensureBuffer = async (): Promise<void> => {
  if (typeof globalThis.Buffer !== 'undefined') return;

  const { Buffer } = await import('buffer');
  globalThis.Buffer = Buffer as unknown as typeof globalThis.Buffer;
};
