import { Layers, type LucideIcon, ShieldAlert, StickyNote, Usb, Users } from 'lucide-react';

import { AdvancedFeature } from '@typings/advancedFeatures';
import { isWebHidSupported } from '@common/ledger/webhid';

type AdvancedFeatureDefinition = {
  key: AdvancedFeature;
  icon: LucideIcon;
  /** When present and false, the browser cannot run the feature and the toggle stays hidden. */
  isSupported?: () => boolean;
};

/** Display order and icons shared by the settings card and the command palette. */
export const ADVANCED_FEATURES: AdvancedFeatureDefinition[] = [
  { key: AdvancedFeature.Subaccounts, icon: Layers },
  { key: AdvancedFeature.AdvancedFollowing, icon: Users },
  { key: AdvancedFeature.ShowNonConstructiveProposals, icon: ShieldAlert },
  { key: AdvancedFeature.TransactionMemo, icon: StickyNote },
  { key: AdvancedFeature.LedgerDevice, icon: Usb, isSupported: isWebHidSupported },
];

/** The features the current browser can run. */
export const getSupportedAdvancedFeatures = (): AdvancedFeatureDefinition[] =>
  ADVANCED_FEATURES.filter(({ isSupported }) => isSupported?.() ?? true);
