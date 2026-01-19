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
        <p className="leading-none font-medium">{t(($) => $.accountSettings.theme)}</p>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.accountSettings.themeDescription)}
        </p>
      </div>
      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={(value: Theme) => {
          if (value) setTheme(value);
        }}
        className="rounded-md border"
      >
        <ToggleGroupItem
          value={Theme.Light}
          aria-label={t(($) => $.accountSettings.aria.toggleLight)}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span className="hidden xs:inline">{t(($) => $.accountSettings.modes.light)}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={Theme.Dark}
          aria-label={t(($) => $.accountSettings.aria.toggleDark)}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span className="hidden xs:inline">{t(($) => $.accountSettings.modes.dark)}</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value={Theme.System}
          aria-label={t(($) => $.accountSettings.aria.toggleSystem)}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span className="hidden xs:inline">{t(($) => $.accountSettings.modes.system)}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
