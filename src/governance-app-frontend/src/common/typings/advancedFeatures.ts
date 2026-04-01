export enum AdvancedFeature {
  Subaccounts = 'subaccounts',
  AdvancedFollowing = 'advancedFollowing',
  ShowNonConstructiveProposals = 'showNonConstructiveProposals',
}

export type AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: boolean;
  [AdvancedFeature.AdvancedFollowing]: boolean;
  [AdvancedFeature.ShowNonConstructiveProposals]: boolean;
};

export const ADVANCED_FEATURES_DEFAULTS: AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: false,
  [AdvancedFeature.AdvancedFollowing]: false,
  [AdvancedFeature.ShowNonConstructiveProposals]: false,
};
