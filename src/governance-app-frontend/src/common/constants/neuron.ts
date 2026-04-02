import { SECONDS_IN_TWO_WEEKS, SECONDS_IN_TWO_YEARS } from './extra';

export const ICP_MIN_DISSOLVE_DELAY_SECONDS = SECONDS_IN_TWO_WEEKS;
export const ICP_MAX_DISSOLVE_DELAY_SECONDS = SECONDS_IN_TWO_YEARS;

// Month-based constants are used as keys into stakingFlowApyPreview.
// They will be updated together with the staking wizard presets in Phase 2.
export const ICP_MIN_DISSOLVE_DELAY_MONTHS = 6;
export const ICP_MAX_DISSOLVE_DELAY_MONTHS = 96;

export const DFINITY_NEURON_ID = 27n;
