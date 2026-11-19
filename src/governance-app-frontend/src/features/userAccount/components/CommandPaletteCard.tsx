import { useTranslation } from 'react-i18next';

import { Kbd } from '@components/Kbd';
import { Switch } from '@components/Switch';
import { useCommandPaletteSettings } from '@hooks/useCommandPaletteSettings';
import { isApplePlatform } from '@utils/platform';

export const CommandPaletteCard = () => {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useCommandPaletteSettings();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="leading-none font-medium">{t(($) => $.userAccount.commandPalette.title)}</p>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.userAccount.commandPalette.description)}
        </p>
        <div className="pt-2">
          <Kbd>{isApplePlatform ? '⌘K' : 'Ctrl K'}</Kbd>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-label={t(($) => $.userAccount.commandPalette.aria.toggle)}
        className="shrink-0"
      />
    </div>
  );
};
