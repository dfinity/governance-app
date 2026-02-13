import { Principal } from '@icp-sdk/core/principal';

/**
 * Converts a string to a Principal.
 * @param address - The string representation of a principal
 * @returns Principal or `undefined` when not valid
 */
export const getPrincipalFromString = (address: string): Principal | undefined => {
  try {
    return Principal.fromText(address);
  } catch (_) {
    return undefined;
  }
};
