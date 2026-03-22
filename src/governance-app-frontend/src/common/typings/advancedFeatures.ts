export enum AdvancedFeature {
  Subaccounts = 'subaccounts',
  AdvancedFollowing = 'advancedFollowing',
}

export type AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: boolean;
  [AdvancedFeature.AdvancedFollowing]: boolean;
};

export const ADVANCED_FEATURES_DEFAULTS: AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: false,
  [AdvancedFeature.AdvancedFollowing]: false,
};
