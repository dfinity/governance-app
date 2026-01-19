import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@components/Drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';
import { Theme } from '@contexts/themeContext';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useTheme } from '@hooks/useTheme';
import { cn } from '@utils/shadcn';

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

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

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];
  const Icon = currentTheme.icon;

  const trigger = (
    <Button
      variant="ghost"
      className="h-full w-14 rounded-none px-0"
      aria-label={t(($) => $.accountSettings.theme)}
    >
      <Icon className="size-5" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );

  if (isDesktop) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32" collisionPadding={8}>
          {themes.map((t) => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className="cursor-pointer"
            >
              <t.icon className="mr-2 size-4" />
              <span>{t.label}</span>
              {theme === t.value && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t(($) => $.accountSettings.theme)}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 pb-8">
          {themes.map((t) => (
            <Button
              key={t.value}
              variant="ghost"
              className={cn(
                'h-12 justify-start px-4',
                theme === t.value && 'bg-accent text-accent-foreground',
              )}
              onClick={() => setTheme(t.value)}
            >
              <t.icon className="mr-3 size-5" />
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.value && <Check className="size-5" />}
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
