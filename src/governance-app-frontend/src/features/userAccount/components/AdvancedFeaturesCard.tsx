import { useTranslation } from 'react-i18next';

import { Switch } from '@components/Switch';
import { ADVANCED_FEATURES } from '@constants/advancedFeatures';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { notifyAdvancedFeatureChange } from '@utils/advancedFeatures';

export const AdvancedFeaturesCard = () => {
  const { t } = useTranslation();
  const { features, setFeature } = useAdvancedFeatures();

  return (
    <div className="flex flex-col divide-y">
      {ADVANCED_FEATURES.map(({ key, icon: Icon }) => (
        <div key={key} className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Icon className="size-5 shrink-0 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="font-medium">
                {t(($) => $.userAccount.advancedFeatures.items[key].label)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(($) => $.userAccount.advancedFeatures.items[key].description)}
              </p>
            </div>
          </div>
          <Switch
            checked={features[key]}
            onCheckedChange={(value) => {
              setFeature(key, value);
              notifyAdvancedFeatureChange(t, key, value);
            }}
            aria-label={t(($) => $.userAccount.advancedFeatures.items[key].aria.toggle)}
            className="shrink-0"
            data-testid={`advanced-feature-toggle-${key}`}
          />
        </div>
      ))}
    </div>
  );
};
