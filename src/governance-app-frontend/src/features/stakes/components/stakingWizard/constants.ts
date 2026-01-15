import {
  StakingWizardDissolveDelayPreset,
  StakingWizardFormState,
  StakingWizardInitialState,
  StakingWizardMaturityMode,
} from './types';

export const STAKING_WIZARD_DEFAULT_FORM_STATE: StakingWizardFormState = {
  amount: '',
  dissolveDelayMonths: StakingWizardDissolveDelayPreset.TwoYears,
  maturityMode: StakingWizardMaturityMode.Liquid,
  initialState: StakingWizardInitialState.Locked,
};

export const STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS: {
  value: StakingWizardDissolveDelayPreset;
  labelKey: '6months' | '1year' | '2years' | '4years' | '8years';
}[] = [
  { value: StakingWizardDissolveDelayPreset.SixMonths, labelKey: '6months' },
  { value: StakingWizardDissolveDelayPreset.OneYear, labelKey: '1year' },
  { value: StakingWizardDissolveDelayPreset.TwoYears, labelKey: '2years' },
  { value: StakingWizardDissolveDelayPreset.FourYears, labelKey: '4years' },
  { value: StakingWizardDissolveDelayPreset.EightYears, labelKey: '8years' },
];
