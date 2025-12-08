import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@hooks/useTheme';

import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { themePreference, setThemePreference } = useTheme();
  const { t } = useTranslation();

  const cycleTheme = () => {
    if (themePreference === 'light') setThemePreference('dark');
    else if (themePreference === 'dark') setThemePreference('system');
    else setThemePreference('light');
  };

  const currentIcon = () => {
    if (themePreference === 'light') return <Sun className="h-[1.2rem] w-[1.2rem]" />;
    if (themePreference === 'dark') return <Moon className="h-[1.2rem] w-[1.2rem]" />;
    return <Monitor className="h-[1.2rem] w-[1.2rem]" />;
  };

  // Determine label for accessibility
  const label =
    themePreference === 'light'
      ? t(($) => $.common.switchToDarkMode)
      : themePreference === 'dark'
        ? t(($) => $.common.switchToSystemMode)
        : t(($) => $.common.switchToLightMode);

  return (
    <Button variant="outline" size="icon" onClick={cycleTheme} aria-label={label as string}>
      {currentIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
