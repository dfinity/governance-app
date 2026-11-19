import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import {
  closeCommandPalette,
  openCommandPalette,
  registerCommandPalette,
  restoreCommandPaletteFocus,
  useCommandPaletteMounted,
  useCommandPaletteOpen,
} from './useCommandPaletteOpen';

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

describe('useCommandPaletteOpen', () => {
  afterEach(() => {
    act(() => closeCommandPalette());
    vi.clearAllMocks();
  });

  it('starts closed.', () => {
    const { result } = renderHook(() => useCommandPaletteOpen());

    expect(result.current).toBe(false);
  });

  it('opens and closes the palette for each subscriber.', () => {
    const first = renderHook(() => useCommandPaletteOpen());
    const second = renderHook(() => useCommandPaletteOpen());

    act(() => openCommandPalette('sidebar'));
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);

    act(() => closeCommandPalette());
    expect(first.result.current).toBe(false);
    expect(second.result.current).toBe(false);
  });

  it('sends the open event with the source.', () => {
    openCommandPalette('mobile_header');

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.CommandPaletteOpen, {
      source: 'mobile_header',
    });
  });

  it('sends no second open event while the palette is open.', () => {
    openCommandPalette('shortcut');
    openCommandPalette('sidebar');

    expect(analytics.event).toHaveBeenCalledOnce();
  });

  it('restores the focus to the element that opened the palette.', () => {
    const button = document.body.appendChild(document.createElement('button'));
    button.focus();

    openCommandPalette('sidebar');
    (document.activeElement as HTMLElement).blur();
    closeCommandPalette();

    expect(restoreCommandPaletteFocus()).toBe(true);
    expect(document.activeElement).toBe(button);
    button.remove();
  });

  it('does not restore the focus to an element that left the page.', () => {
    const button = document.body.appendChild(document.createElement('button'));
    button.focus();

    openCommandPalette('mobile_header');
    button.remove();
    closeCommandPalette();

    expect(restoreCommandPaletteFocus()).toBe(false);
  });

  it('reports whether a palette is mounted.', () => {
    const { result } = renderHook(() => useCommandPaletteMounted());
    expect(result.current).toBe(false);

    let unregister = () => {};
    act(() => {
      unregister = registerCommandPalette();
    });
    expect(result.current).toBe(true);

    act(() => unregister());
    expect(result.current).toBe(false);
  });

  it('closes the palette when the palette unmounts.', () => {
    const unregister = registerCommandPalette();
    openCommandPalette('sidebar');
    const { result } = renderHook(() => useCommandPaletteOpen());

    act(() => unregister());

    expect(result.current).toBe(false);
  });
});
