import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Theme } from '@contexts/themeContext';
import { useTheme } from '@hooks/useTheme';
import { cn } from '@utils/shadcn';

export const ThemeCard = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const themes = useMemo(
    () => [
      {
        value: Theme.Light,
        label: t(($) => $.accountSettings.modes.light),
        icon: Sun,
      },
      {
        value: Theme.Dark,
        label: t(($) => $.accountSettings.modes.dark),
        icon: Moon,
      },
      {
        value: Theme.System,
        label: t(($) => $.accountSettings.modes.system),
        icon: Monitor,
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{t(($) => $.accountSettings.theme)}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(($) => $.accountSettings.themeDescription)}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {themes.map((t) => (
          <Button
            key={t.value}
            variant={theme === t.value ? 'default' : 'outline'}
            className={cn(
              'h-auto flex-1 flex-col gap-2 py-4',
              theme === t.value && 'ring-2 ring-primary ring-offset-2',
            )}
            onClick={() => setTheme(t.value)}
          >
            <t.icon className="size-6" />
            <span className="text-sm font-medium">{t.label}</span>
            {theme === t.value && <Check className="absolute top-2 right-2 size-4" />}
          </Button>
        ))}
      </div>
    </div>
  );
};
