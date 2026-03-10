import { useTranslation } from 'react-i18next';

import { Switch } from '@components/Switch';
import { useSubaccountsEnabled } from '@hooks/useSubaccountsEnabled';
import { defaultNotification, successNotification } from '@utils/notification';

export const SubaccountsCard = () => {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useSubaccountsEnabled();

  const handleChange = (checked: boolean) => {
    setEnabled(checked);

    if (checked) {
      successNotification({
        title: t(($) => $.accounts.settings.enabled),
        description: t(($) => $.accounts.settings.enabledDescription),
      });
    } else {
      defaultNotification({
        title: t(($) => $.accounts.settings.disabled),
        description: t(($) => $.accounts.settings.disabledDescription),
      });
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="leading-none font-medium">{t(($) => $.accounts.settings.title)}</p>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.accounts.settings.description)}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        aria-label={t(($) => $.accounts.settings.aria.toggle)}
        className="shrink-0"
      />
    </div>
  );
};
