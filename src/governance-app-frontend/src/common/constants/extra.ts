import { CANISTER_ID_INTERNET_IDENTITY } from './canisterIds';

export const IS_LOCAL = process.env.DFX_NETWORK === 'local';
export const HOST = process.env.DFX_HOST;
export const NETWORK = `${IS_LOCAL ? 'http://' : 'https://'}${HOST}`;
// @TODO: Review this for the new domain
export const IS_TESTNET =
  IS_LOCAL && !(HOST?.includes('.icp-api.io') || HOST?.includes('.ic0.app'));

export const PAGINATION_LIMIT_PROPOSALS = 25;
// Somehow this one has a different limit in case of a certified request.
export const PAGINATION_LIMIT_TRANSACTIONS = 50;
export const MIN_ASYNC_DELAY = 300; // Avoids flashing of loading indicators.

export const E8S_PRECISION = 8;
export const E8S = 10 ** E8S_PRECISION;
export const E8Sn = BigInt(E8S);
export const U64_MAX = 2n ** 64n - 1n;

export const ICP_MIN_STAKE_AMOUNT = 1;
export const ICP_MIN_DISBURSE_MATURITY_AMOUNT = 1;
export const ICP_TRANSACTION_FEE = 0.0001;
export const ICP_TRANSACTION_FEE_E8S = ICP_TRANSACTION_FEE * E8S;
export const ICP_TRANSACTION_FEE_E8Sn = BigInt(ICP_TRANSACTION_FEE_E8S);
export const ICP_TRANSACTION_PROPAGATION_DELAY_MS = 2_000;

export const VOTING_RESULTS_PRECISION = 6; // Number of digits after the decimal point.

// Time constants
export const MILLISECONDS_IN_SECOND = 1_000;
export const NANOSECONDS_IN_SECOND = 1_000_000_000;
export const SECONDS_IN_DAY = 60 * 60 * 24;
// Taking into account 1/4 of leap year
export const SECONDS_IN_YEAR = ((4 * 365 + 1) * SECONDS_IN_DAY) / 4;
export const SECONDS_IN_HALF_YEAR = SECONDS_IN_YEAR / 2;
export const SECONDS_IN_MONTH = SECONDS_IN_YEAR / 12;
export const SECONDS_IN_FOUR_YEARS = SECONDS_IN_YEAR * 4;
export const SECONDS_IN_EIGHT_YEARS = SECONDS_IN_YEAR * 8;
export const DAYS_IN_AVG_YEAR = 365.25;

// NNS reward parameters
export const NNS_GENESIS_TIMESTAMP_SECONDS = 1_620_604_800; // May 10, 2021
export const NNS_INITIAL_REWARD_RATE = 0.1; // 10%
export const NNS_FINAL_REWARD_RATE = 0.05; // 5%

// Neuron bonuses
export const MAX_DISSOLVE_DELAY_BONUS = 1; // +100%
export const MAX_AGE_BONUS = 0.25; // +25%

// Local Storage Keys
export const MANUAL_LOGOUT_KEY = 'nns-manual-logout';
export const WELCOME_MODAL_STORAGE_KEY = 'nns-welcome-modal-seen';
export const SHORTCUTS_SETTINGS_KEY = 'nns-shortcuts-settings';
export const SUBACCOUNTS_SETTINGS_KEY = 'nns-subaccounts-settings';
export const ADVANCED_FEATURES_STORAGE_KEY = 'nns-advanced-features';

// External Links
export const DASHBOARD_URL = `https://dashboard.internetcomputer.org/neuron`;

const localIdentityProvider = `http://${CANISTER_ID_INTERNET_IDENTITY}.${HOST}`;
const mainnetIdentityProvider = 'https://id.ai/?feature_flag_min_guided_upgrade=true';
export const IDENTITY_PROVIDER = IS_LOCAL ? localIdentityProvider : mainnetIdentityProvider;
export const II_DERIVATION_ORIGIN = IS_LOCAL ? null : 'https://nns.ic0.app';
