import { useTranslation } from 'react-i18next';

import { Button } from '@untitledui/base/buttons/button';
import { Tooltip } from '@untitledui/base/tooltip/tooltip';
import { Monitor01, Moon01, Sun } from '@untitledui/icons';

import { useTheme } from '@hooks/useTheme';

export const ToggleThemeButton = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const getNextTheme = () => {
    switch (theme) {
      case 'system':
        return 'light';
      case 'light':
        return 'dark';
      case 'dark':
        return 'system';
    }
  };

  const getCurrentIcon = () => {
    switch (theme) {
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

  return (
    <Tooltip title={getTooltipText()}>
      <Button
        aria-label={getTooltipText()}
        color="tertiary"
        size="sm"
        iconLeading={getCurrentIcon()}
        onClick={() => setTheme(getNextTheme())}
      />
    </Tooltip>
  );
};
