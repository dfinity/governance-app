export const IS_LOCAL = process.env.DFX_NETWORK === 'local';
export const HOST = process.env.DFX_HOST;
export const NETWORK = `${IS_LOCAL ? 'http://' : 'https://'}${HOST}`;

export const PAGINATION_LIMIT = 100;
export const MIN_ASYNC_DELAY = 300; // Avoids flashing of loading indicators.

export const E8S = 100_000_000;
export const E8Sn = 100_000_000n;

export const VOTING_RESULTS_PRECISION = 6; // Number of digits after the decimal point.
