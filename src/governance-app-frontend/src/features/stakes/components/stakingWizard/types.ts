export enum StakingWizardStep {
  Amount,
  DissolveDelay,
  Configuration,
  Confirmation,
}

export enum StakingWizardDissolveDelayPreset {
  SixMonths = 6,
  OneYear = 12,
  TwoYears = 24,
  FourYears = 48,
  EightYears = 96,
}

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
  dissolveDelayMonths: StakingWizardDissolveDelayPreset;
  maturityMode: StakingWizardMaturityMode;
  initialState: StakingWizardInitialState;
}
