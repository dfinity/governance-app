import { SECONDS_IN_TWO_WEEKS, SECONDS_IN_TWO_YEARS } from './extra';

export const ICP_MIN_DISSOLVE_DELAY_SECONDS = SECONDS_IN_TWO_WEEKS;
export const ICP_MAX_DISSOLVE_DELAY_SECONDS = SECONDS_IN_TWO_YEARS;

// Only used for color interpolation, ok if not very precise (should be two weeks).
export const ICP_MIN_DISSOLVE_DELAY_MONTHS = 1;

export const ICP_MAX_DISSOLVE_DELAY_MONTHS = 24;

export const DFINITY_NEURON_ID = 27n;
