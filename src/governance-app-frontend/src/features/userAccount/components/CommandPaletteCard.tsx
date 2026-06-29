import { useTranslation } from 'react-i18next';

import { Kbd, KbdGroup } from '@components/Kbd';
import { Switch } from '@components/Switch';
import { useCommandPaletteSettings } from '@hooks/useCommandPaletteSettings';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
          <KbdGroup>
            <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
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
