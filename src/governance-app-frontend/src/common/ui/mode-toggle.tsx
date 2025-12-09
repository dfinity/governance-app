import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@hooks/useTheme';

import { Button } from '@/common/ui/button';

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const { t } = useTranslation();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const currentIcon = () => {
    if (theme === 'light') return <Sun className="h-[1.2rem] w-[1.2rem]" />;
    if (theme === 'dark') return <Moon className="h-[1.2rem] w-[1.2rem]" />;
    return <Monitor className="h-[1.2rem] w-[1.2rem]" />;
  };

  // Determine label for accessibility
  const label =
    theme === 'light'
      ? t(($) => $.common.switchToDarkMode)
      : theme === 'dark'
        ? t(($) => $.common.switchToSystemMode)
        : t(($) => $.common.switchToLightMode);

  return (
    <Button variant="outline" size="icon" onClick={cycleTheme} aria-label={label as string}>
      {currentIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
