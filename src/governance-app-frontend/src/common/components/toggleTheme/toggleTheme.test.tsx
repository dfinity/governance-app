import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Theme } from '@common/contexts/themeContext';
import { STORAGE_KEYS } from '@common/utils/storageKeys';
import { renderWithProviders } from '@common/utils/unitTests';
import i18n from '@/i18n/config';

import { ToggleTheme } from './ToggleTheme';

describe('Theme', () => {
  it('Toggles Theme when clicked.', async () => {
    renderWithProviders(<ToggleTheme />);
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(Theme.Light);
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToDarkMode))).toBeDefined();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(Theme.Dark);
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToLightMode))).toBeDefined();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(Theme.Light);
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToDarkMode))).toBeDefined();
  });
});
