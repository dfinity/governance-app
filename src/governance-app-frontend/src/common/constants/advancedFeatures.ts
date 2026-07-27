import { Layers, type LucideIcon, ShieldAlert, StickyNote, Users } from 'lucide-react';

import { AdvancedFeature } from '@typings/advancedFeatures';

type AdvancedFeatureDefinition = {
  key: AdvancedFeature;
  icon: LucideIcon;
};

/** Display order and icons shared by the settings card and the command palette. */
export const ADVANCED_FEATURES: AdvancedFeatureDefinition[] = [
  { key: AdvancedFeature.Subaccounts, icon: Layers },
  { key: AdvancedFeature.AdvancedFollowing, icon: Users },
  { key: AdvancedFeature.ShowNonConstructiveProposals, icon: ShieldAlert },
  { key: AdvancedFeature.TransactionMemo, icon: StickyNote },
];
