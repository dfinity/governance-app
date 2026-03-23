import { Principal } from '@icp-sdk/core/principal';

/**
 * Converts a string to a Principal.
 * @param address - The string representation of a principal
 * @returns Principal or `undefined` when not valid
 */
export const getPrincipalFromString = (address: string): Principal | undefined => {
  try {
    return Principal.fromText(address);
  } catch {
    return undefined;
  }
};

const PRINCIPAL_TRUNCATE_LENGTH = 5;

export const truncatePrincipal = (principal: string) => {
  if (principal.length <= PRINCIPAL_TRUNCATE_LENGTH * 2 + 3) return principal;
  return `${principal.slice(0, PRINCIPAL_TRUNCATE_LENGTH)}...${principal.slice(-PRINCIPAL_TRUNCATE_LENGTH)}`;
};
