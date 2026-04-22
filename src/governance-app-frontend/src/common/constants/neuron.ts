import { SECONDS_IN_TWO_WEEKS, SECONDS_IN_TWO_YEARS } from './extra';

export const ICP_MIN_DISSOLVE_DELAY_SECONDS = SECONDS_IN_TWO_WEEKS;
export const ICP_MAX_DISSOLVE_DELAY_SECONDS = SECONDS_IN_TWO_YEARS;

// Key into stakingFlowApyPreview for APY color / badge styling: the shortest
// previewed dissolve delay (network minimum, 2 weeks).
export const STAKING_APY_PREVIEW_MIN_SECONDS = SECONDS_IN_TWO_WEEKS;

export const DFINITY_NEURON_ID = 27n;
