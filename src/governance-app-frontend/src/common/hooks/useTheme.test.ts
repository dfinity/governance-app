import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Theme, THEME_COLOR } from '@constants/theme';

import { useTheme } from './useTheme';

const mockSystemTheme = (theme: Theme.Dark | Theme.Light) =>
  vi.mocked(window.matchMedia).mockImplementation(
    (query) =>
      ({
        matches: theme === Theme.Dark,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

describe('useTheme', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    meta.remove();
    document.documentElement.classList.remove(Theme.Dark);
  });

  it('Sets the theme-color meta tag to the light background.', () => {
    mockSystemTheme(Theme.Light);
    renderHook(() => useTheme());

    expect(meta.content).toBe(THEME_COLOR[Theme.Light]);
  });

  it('Sets the theme-color meta tag to the dark background.', () => {
    mockSystemTheme(Theme.Dark);
    renderHook(() => useTheme());

    expect(meta.content).toBe(THEME_COLOR[Theme.Dark]);
  });

  it('Does not fail without a theme-color meta tag.', () => {
    meta.remove();
    mockSystemTheme(Theme.Dark);

    expect(() => renderHook(() => useTheme())).not.toThrow();
  });
});
