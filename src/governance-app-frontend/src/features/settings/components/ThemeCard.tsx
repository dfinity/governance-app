import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { Theme } from '@contexts/themeContext';
import { useTheme } from '@hooks/useTheme';

const ThemeCard = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Card className="rounded-md px-4 py-6">
      <CardContent className="p-0">
        <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between md:gap-y-0">
          <div className="space-y-1">
            <p className="leading-none font-medium">{t(($) => $.settings.theme)}</p>
            <p className="text-sm text-muted-foreground">{t(($) => $.settings.themeDescription)}</p>
          </div>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(value: Theme) => {
              if (value) setTheme(value);
            }}
            className="rounded-md border"
          >
            <ToggleGroupItem value="light" aria-label={t(($) => $.settings.aria.toggleLight)}>
              <Sun className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">{t(($) => $.settings.modes.light)}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label={t(($) => $.settings.aria.toggleDark)}>
              <Moon className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">{t(($) => $.settings.modes.dark)}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label={t(($) => $.settings.aria.toggleSystem)}>
              <Monitor className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">{t(($) => $.settings.modes.system)}</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export { ThemeCard };
