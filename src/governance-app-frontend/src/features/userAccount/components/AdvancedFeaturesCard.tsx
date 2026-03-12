import { Layers, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Switch } from '@components/Switch';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { defaultNotification, successNotification } from '@utils/notification';

type FeatureDefinition = {
  key: AdvancedFeature;
  icon: LucideIcon;
  ariaLabel: string;
};

const FEATURES: FeatureDefinition[] = [
  { key: AdvancedFeature.Subaccounts, icon: Layers, ariaLabel: 'accounts.settings.aria.toggle' },
];

export const AdvancedFeaturesCard = () => {
  const { t } = useTranslation();
  const { features, setFeature } = useAdvancedFeatures();

  return (
    <div className="flex flex-col divide-y">
      {FEATURES.map(({ key, icon: Icon }) => (
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
              const notify = value ? successNotification : defaultNotification;
              notify({
                title: value
                  ? t(($) => $.accounts.settings.enabled)
                  : t(($) => $.accounts.settings.disabled),
                description: value
                  ? t(($) => $.accounts.settings.enabledDescription)
                  : t(($) => $.accounts.settings.disabledDescription),
              });
            }}
            aria-label={t(($) => $.accounts.settings.aria.toggle)}
            className="shrink-0"
          />
        </div>
      ))}
    </div>
  );
};
