export const IS_LOCAL = process.env.DFX_NETWORK === 'local';
export const HOST = process.env.DFX_HOST || 'localhost:8080';
export const LOCAL_NETWORK = `http://${HOST}`;
export const MAINNET_NETWORK = 'https://ic0.app';

export const PAGINATION_LIMIT = 100;
export const MIN_ASYNC_DELAY = 200; // Avoids flashing of loading indicators.

export const E8S = 100_000_000;
