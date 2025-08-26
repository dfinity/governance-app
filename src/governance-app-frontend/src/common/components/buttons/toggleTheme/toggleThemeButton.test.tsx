import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Theme } from '@contexts/themeContext';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { renderWithProviders } from '@utils/unitTests';

import i18n from '@/i18n/config';

import { ToggleThemeButton } from './ToggleThemeButton';

describe('Theme', () => {
  it('Toggles Theme when clicked.', async () => {
    renderWithProviders(<ToggleThemeButton />);
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(Theme.Light);
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToDarkMode))).toBeDefined();
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToLightMode))).not.toBeDefined();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(Theme.Dark);
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToLightMode))).toBeDefined();
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToDarkMode))).not.toBeDefined();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(Theme.Light);
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToDarkMode))).toBeDefined();
    expect(screen.getAllByTitle(i18n.t(($) => $.common.switchToLightMode))).not.toBeDefined();
  });
});
