/**
 * Error for an `Err` variant of a canister response. It keeps the variant name next to
 * the user-facing message.
 */
export class CanisterResponseError extends Error {
  constructor(
    message: string,
    readonly variant: string,
  ) {
    super(message);
    this.name = 'CanisterResponseError';
  }
}

/**
 * Returns the variant name of a canister `Err` response, for example `NameTooLong`.
 */
export const getResponseVariant = (response: object): string => Object.keys(response)[0] ?? '';
