import { Button } from '@untitledui/base/buttons/button';
import { Moon01, Sun } from '@untitledui/icons';

import { useTheme } from '@hooks/useTheme';

export const ToggleThemeButton = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      aria-label="Toggle theme"
      color="tertiary"
      size="sm"
      iconLeading={theme === 'light' ? Moon01 : Sun}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    />
  );
};
