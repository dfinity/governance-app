import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { STORAGE_KEYS } from '@utils/storageKeys';
import { renderWithProviders } from '@utils/unitTests';

import i18n from '@/i18n/config';

import { ToggleThemeButton } from './ToggleThemeButton';

describe('Theme', () => {
  it('Toggles Theme when clicked.', async () => {
    renderWithProviders(<ToggleThemeButton />);
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(null);
    expect(screen.getByLabelText(i18n.t(($) => $.common.switchToLightMode))).toBeDefined();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToDarkMode))).toBeNull();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToSystemMode))).toBeNull();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('light');
    expect(screen.getByLabelText(i18n.t(($) => $.common.switchToDarkMode))).toBeDefined();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToLightMode))).toBeNull();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToSystemMode))).toBeNull();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('dark');
    expect(screen.getByLabelText(i18n.t(($) => $.common.switchToSystemMode))).toBeDefined();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToLightMode))).toBeNull();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToDarkMode))).toBeNull();

    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe(null);
    expect(screen.getByLabelText(i18n.t(($) => $.common.switchToLightMode))).toBeDefined();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToDarkMode))).toBeNull();
    expect(screen.queryByLabelText(i18n.t(($) => $.common.switchToSystemMode))).toBeNull();
  });
});
