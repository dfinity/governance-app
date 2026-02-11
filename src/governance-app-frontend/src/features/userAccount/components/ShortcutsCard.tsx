import { useTranslation } from 'react-i18next';

import { Kbd } from '@components/Kbd';
import { Switch } from '@components/Switch';
import { useShortcutSettings } from '@hooks/useShortcutSettings';

interface Shortcut {
  labelKey: 'toggleTheme' | 'logout';
  key: string;
}

const SHORTCUTS: Shortcut[] = [
  { labelKey: 'toggleTheme', key: 'd' },
  { labelKey: 'logout', key: 'u' },
];

export const ShortcutsCard = () => {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useShortcutSettings();

  return (
    <div className="flex flex-col gap-y-4 md:flex-row md:items-start md:justify-between md:gap-y-0">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="leading-none font-medium">{t(($) => $.userAccount.shortcuts.title)}</p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.shortcuts.description)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SHORTCUTS.map(({ labelKey, key }) => (
            <div key={labelKey} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
              <span className="text-xs text-muted-foreground">
                {t(($) => $.userAccount.shortcuts.items[labelKey])}
              </span>
              <Kbd>{key}</Kbd>
            </div>
          ))}
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-label={t(($) => $.userAccount.shortcuts.aria.toggle)}
        className="shrink-0"
      />
    </div>
  );
};
