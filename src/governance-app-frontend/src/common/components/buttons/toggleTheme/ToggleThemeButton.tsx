import { useTranslation } from 'react-i18next';

import { Button, Tooltip } from '@untitledui/components';
import { Monitor01, Moon01, Sun } from '@untitledui/icons';

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
        return Monitor01;
      case 'light':
        return Sun;
      case 'dark':
        return Moon01;
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
