import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, Tooltip } from '@ui';

import { useTheme } from '@hooks/useTheme';

export const ToggleThemeButton = () => {
  const { themePreference, setThemePreference } = useTheme();
  const { t } = useTranslation();

  const getNextTheme = () => {
    switch (themePreference) {
      case 'system':
        return 'light';
      case 'light':
        return 'dark';
      case 'dark':
        return 'system';
    }
  };

  const getCurrentIcon = () => {
    switch (themePreference) {
      case 'system':
        return Monitor;
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
    }
  };

  const getTooltipText = () => {
    const nextTheme = getNextTheme();
    switch (nextTheme) {
      case 'light':
        return t(($) => $.common.switchToLightMode);
      case 'dark':
        return t(($) => $.common.switchToDarkMode);
      case 'system':
        return t(($) => $.common.switchToSystemMode);
    }
  };
  const title = getTooltipText();

  return (
    <Tooltip title={title}>
      <Button
        aria-label={title}
        color="tertiary"
        size="sm"
        iconLeading={getCurrentIcon()}
        onClick={() => setThemePreference(getNextTheme())}
      />
    </Tooltip>
  );
};
