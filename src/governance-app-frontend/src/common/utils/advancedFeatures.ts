import type { TFunction } from 'i18next';

import { AdvancedFeature, type AdvancedFeaturesSettings } from '@typings/advancedFeatures';
import { defaultNotification, successNotification } from '@utils/notification';

/** Feedback shown whenever a feature is toggled, from the settings card or the command palette. */
export const notifyAdvancedFeatureChange = (
  t: TFunction,
  key: AdvancedFeature,
  enabled: boolean,
): void => {
  const notify = enabled ? successNotification : defaultNotification;
  notify({
    title: enabled
      ? t(($) => $.userAccount.advancedFeatures.items[key].enabled)
      : t(($) => $.userAccount.advancedFeatures.items[key].disabled),
    description: enabled
      ? t(($) => $.userAccount.advancedFeatures.items[key].enabledDescription)
      : t(($) => $.userAccount.advancedFeatures.items[key].disabledDescription),
  });
};

/** The accounts page, its nav item, and the dashboard accounts card open when either flag is on. */
export const isAccountsAreaEnabled = (features: AdvancedFeaturesSettings): boolean =>
  features[AdvancedFeature.Subaccounts] || features[AdvancedFeature.LedgerDevice];
