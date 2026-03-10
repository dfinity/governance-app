export enum AdvancedFeature {
  Subaccounts = 'subaccounts',
}

export type AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: boolean;
};

export const ADVANCED_FEATURES_DEFAULTS: AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: false,
};
