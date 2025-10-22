export const IS_LOCAL = process.env.DFX_NETWORK === 'local';
export const HOST = process.env.DFX_HOST;
export const NETWORK = `${IS_LOCAL ? 'http://' : 'https://'}${HOST}`;
export const IS_TESTNET =
  IS_LOCAL && !(HOST?.includes('.icp-api.io') || HOST?.includes('.ic0.app'));

export const PAGINATION_LIMIT = 100;
// Somehow this one has a different limit in case of a certified request.
export const PAGINATION_LIMIT_TRANSACTIONS = 50;
export const MIN_ASYNC_DELAY = 300; // Avoids flashing of loading indicators.

export const E8S = 100_000_000;
export const E8Sn = BigInt(E8S);
export const U64_MAX = 2n ** 64n - 1n;

export const ICP_MIN_STAKE_AMOUNT = 1;
export const ICP_MIN_TRANSFER_AMOUNT = 1;
export const ICP_TRANSACTION_FEE = 0.0001;
export const ICP_TRANSACTION_FEE_E8S = ICP_TRANSACTION_FEE * E8S;
export const ICP_TRANSACTION_FEE_E8Sn = BigInt(ICP_TRANSACTION_FEE_E8S);
export const ICP_TRANSACTION_PROPAGATION_DELAY_MS = 2_000;

export const VOTING_RESULTS_PRECISION = 6; // Number of digits after the decimal point.

export const SECONDS_IN_DAY = 60 * 60 * 24;
// Taking into account 1/4 of leap year
export const SECONDS_IN_YEAR = ((4 * 365 + 1) * SECONDS_IN_DAY) / 4;
