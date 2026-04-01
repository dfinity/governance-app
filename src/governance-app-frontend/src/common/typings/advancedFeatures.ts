export enum AdvancedFeature {
  Subaccounts = 'subaccounts',
  AdvancedFollowing = 'advancedFollowing',
  ShowSpamProposals = 'showSpamProposals',
}

export type AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: boolean;
  [AdvancedFeature.AdvancedFollowing]: boolean;
  [AdvancedFeature.ShowSpamProposals]: boolean;
};

export const ADVANCED_FEATURES_DEFAULTS: AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: false,
  [AdvancedFeature.AdvancedFollowing]: false,
  [AdvancedFeature.ShowSpamProposals]: false,
};
