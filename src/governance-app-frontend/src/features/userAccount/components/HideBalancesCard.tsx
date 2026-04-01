import { useTranslation } from 'react-i18next';

import { Switch } from '@components/Switch';
import { useHideBalances } from '@hooks/useHideBalances';

export const HideBalancesCard = () => {
  const { t } = useTranslation();
  const { hidden, setHidden } = useHideBalances();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="leading-none font-medium">{t(($) => $.userAccount.hideBalances.title)}</p>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.userAccount.hideBalances.description)}
        </p>
      </div>
      <Switch
        checked={hidden}
        onCheckedChange={setHidden}
        aria-label={t(($) => $.userAccount.hideBalances.aria.toggle)}
        className="shrink-0"
      />
    </div>
  );
};
