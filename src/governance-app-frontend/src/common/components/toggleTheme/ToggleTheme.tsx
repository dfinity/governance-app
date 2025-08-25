import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import { Theme } from '@common/contexts/themeContext';
import { useTheme } from '@common/hooks/useTheme';

export const ToggleTheme = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const isDark = theme === Theme.Dark;

  return (
    <button
      title={t(($) => (isDark ? $.common.switchToLightMode : $.common.switchToDarkMode))}
      className={classNames('fz-18 bg-blue-900', {
        ['bg-orange-900']: isDark,
      })}
      onClick={toggleTheme}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};
