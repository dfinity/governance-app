import {
  SECONDS_IN_MONTH,
  SECONDS_IN_TWO_WEEKS,
  SECONDS_IN_TWO_YEARS,
  SECONDS_IN_YEAR,
} from '@constants/extra';

export enum StakingWizardStep {
  Amount,
  DissolveDelay,
  Configuration,
  Confirmation,
}

// Values are dissolve-delay durations expressed in seconds so we can represent
// the true network minimum (2 weeks), which is not an integer number of months.
export const StakingWizardDissolveDelayPreset = {
  TwoWeeks: SECONDS_IN_TWO_WEEKS,
  ThreeMonths: 3 * SECONDS_IN_MONTH,
  SixMonths: 6 * SECONDS_IN_MONTH,
  OneYear: SECONDS_IN_YEAR,
  TwoYears: SECONDS_IN_TWO_YEARS,
} as const;
export type StakingWizardDissolveDelayPreset =
  (typeof StakingWizardDissolveDelayPreset)[keyof typeof StakingWizardDissolveDelayPreset];

export enum StakingWizardMaturityMode {
  Auto,
  Liquid,
}

export enum StakingWizardInitialState {
  Locked,
  Dissolving,
}

export enum StakingWizardCreateNeuronStep {
  CreateNeuron,
  SetDissolveDelay,
  SetAutoStakeMaturity,
  StartDissolving,
  SetFollowing,
  Done,
}

export interface StakingWizardFormState {
  amount: string;
  dissolveDelaySeconds: StakingWizardDissolveDelayPreset;
  maturityMode: StakingWizardMaturityMode;
  initialState: StakingWizardInitialState;
  selectedAccountId?: string;
}
