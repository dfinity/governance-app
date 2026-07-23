export enum AdvancedFeature {
  Subaccounts = 'subaccounts',
  AdvancedFollowing = 'advancedFollowing',
  ShowNonConstructiveProposals = 'showNonConstructiveProposals',
  TransactionMemo = 'transactionMemo',
}

export type AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: boolean;
  [AdvancedFeature.AdvancedFollowing]: boolean;
  [AdvancedFeature.ShowNonConstructiveProposals]: boolean;
  [AdvancedFeature.TransactionMemo]: boolean;
};

export const ADVANCED_FEATURES_DEFAULTS: AdvancedFeaturesSettings = {
  [AdvancedFeature.Subaccounts]: false,
  [AdvancedFeature.AdvancedFollowing]: false,
  [AdvancedFeature.ShowNonConstructiveProposals]: false,
  [AdvancedFeature.TransactionMemo]: false,
};
