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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="leading-none font-medium">
            {t(($) => $.userAccount.shortcuts.toggle)}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label={t(($) => $.userAccount.shortcuts.aria.toggle)}
        />
      </div>

      <div className="flex flex-col gap-2">
        {SHORTCUTS.map(({ labelKey, key }) => (
          <div
            key={labelKey}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <span className="text-sm text-muted-foreground">
              {t(($) => $.userAccount.shortcuts.items[labelKey])}
            </span>
            <Kbd>{key}</Kbd>
          </div>
        ))}
      </div>
    </div>
  );
};
