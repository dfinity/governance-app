import { useTranslation } from 'react-i18next';

import { Kbd } from '@components/Kbd';
import { Switch } from '@components/Switch';
import { HIDE_BALANCES_SHORTCUT_KEY } from '@hooks/useHideBalancesShortcut';
import { LOGOUT_SHORTCUT_KEY } from '@hooks/useLogoutShortcut';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { SIDEBAR_SHORTCUT_KEY } from '@hooks/useSidebarShortcut';
import { THEME_SHORTCUT_KEY } from '@hooks/useThemeShortcut';

type Shortcut = {
  labelKey: 'toggleTheme' | 'logout' | 'hideBalances' | 'toggleSidebar';
  key: string;
};

const SHORTCUTS: Shortcut[] = [
  { labelKey: 'toggleTheme', key: THEME_SHORTCUT_KEY },
  { labelKey: 'hideBalances', key: HIDE_BALANCES_SHORTCUT_KEY },
  { labelKey: 'toggleSidebar', key: SIDEBAR_SHORTCUT_KEY },
  { labelKey: 'logout', key: LOGOUT_SHORTCUT_KEY },
];

export const ShortcutsCard = () => {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useShortcutSettings();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 wrap-anywhere">
          <p className="leading-none font-medium">{t(($) => $.userAccount.shortcuts.title)}</p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.shortcuts.description)}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label={t(($) => $.userAccount.shortcuts.aria.toggle)}
          className="shrink-0"
        />
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
  );
};
