import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { Theme } from '@contexts/themeContext';
import { useTheme } from '@hooks/useTheme';

export const ThemeCard = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-y-0">
      <div className="space-y-1">
        <p className="leading-none font-medium">{t(($) => $.userAccount.theme)}</p>
        <p className="text-sm text-muted-foreground">{t(($) => $.userAccount.themeDescription)}</p>
      </div>
      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={(value: Theme) => {
          if (value) setTheme(value);
        }}
        className="w-full rounded-md border lg:w-auto"
      >
        <ToggleGroupItem
          className="shrink-0 grow-1"
          value={Theme.Light}
          aria-label={t(($) => $.userAccount.aria.toggleLight)}
        >
          <Sun className="mr-2 size-4" />
          <span className="hidden xs:inline">{t(($) => $.userAccount.modes.light)}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          className="shrink-0 grow-1"
          value={Theme.Dark}
          aria-label={t(($) => $.userAccount.aria.toggleDark)}
        >
          <Moon className="mr-2 size-4" />
          <span className="hidden xs:inline">{t(($) => $.userAccount.modes.dark)}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          className="shrink-0 grow-1"
          value={Theme.System}
          aria-label={t(($) => $.userAccount.aria.toggleSystem)}
        >
          <Monitor className="mr-2 size-4" />
          <span className="hidden xs:inline">{t(($) => $.userAccount.modes.system)}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
