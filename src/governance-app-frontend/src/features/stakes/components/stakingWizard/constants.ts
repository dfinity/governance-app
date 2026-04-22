import {
  StakingWizardDissolveDelayPreset,
  StakingWizardFormState,
  StakingWizardInitialState,
  StakingWizardMaturityMode,
} from './types';

export const STAKING_WIZARD_DEFAULT_FORM_STATE: StakingWizardFormState = {
  amount: '',
  dissolveDelaySeconds: StakingWizardDissolveDelayPreset.TwoYears,
  maturityMode: StakingWizardMaturityMode.Liquid,
  initialState: StakingWizardInitialState.Locked,
};

export const STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS: {
  value: StakingWizardDissolveDelayPreset;
  labelKey: '2weeks' | '3months' | '6months' | '1year' | '2years';
}[] = [
  { value: StakingWizardDissolveDelayPreset.TwoWeeks, labelKey: '2weeks' },
  { value: StakingWizardDissolveDelayPreset.ThreeMonths, labelKey: '3months' },
  { value: StakingWizardDissolveDelayPreset.SixMonths, labelKey: '6months' },
  { value: StakingWizardDissolveDelayPreset.OneYear, labelKey: '1year' },
  { value: StakingWizardDissolveDelayPreset.TwoYears, labelKey: '2years' },
];
