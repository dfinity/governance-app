import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { Theme } from '@constants/theme';
import { useTheme } from '@hooks/useTheme';

export const ThemeCard = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="@container">
      <div className="flex flex-col gap-y-4 md:@min-[27rem]:flex-row md:@min-[27rem]:items-center md:@min-[27rem]:justify-between md:@min-[27rem]:gap-y-0">
        <div className="space-y-1">
          <p className="leading-none font-medium">{t(($) => $.userAccount.theme)}</p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.themeDescription)}
          </p>
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
            className="shrink grow-1 px-1 @min-[17rem]:shrink-0 @min-[17rem]:px-3"
            value={Theme.Light}
            aria-label={t(($) => $.userAccount.aria.toggleLight)}
          >
            <Sun className="size-4 @min-[17rem]:mr-2" />
            <span className="hidden @min-[17rem]:inline">
              {t(($) => $.userAccount.modes.light)}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            className="shrink grow-1 px-1 @min-[17rem]:shrink-0 @min-[17rem]:px-3"
            value={Theme.Dark}
            aria-label={t(($) => $.userAccount.aria.toggleDark)}
          >
            <Moon className="size-4 @min-[17rem]:mr-2" />
            <span className="hidden @min-[17rem]:inline">{t(($) => $.userAccount.modes.dark)}</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            className="shrink grow-1 px-1 @min-[17rem]:shrink-0 @min-[17rem]:px-3"
            value={Theme.System}
            aria-label={t(($) => $.userAccount.aria.toggleSystem)}
          >
            <Monitor className="size-4 @min-[17rem]:mr-2" />
            <span className="hidden @min-[17rem]:inline">
              {t(($) => $.userAccount.modes.system)}
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
