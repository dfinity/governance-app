import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SIDEBAR_COLLAPSED_KEY } from '@constants/extra';

import { useSidebarCollapsed } from './useSidebarCollapsed';
import { useSidebarShortcut } from './useSidebarShortcut';

const mocks = vi.hoisted(() => ({ shortcutsEnabled: true }));

vi.mock('@hooks/useShortcutSettings', () => ({
  useShortcutSettings: () => ({ enabled: mocks.shortcutsEnabled }),
}));
vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

const pressKey = (key: string, target: EventTarget = document.body, init: KeyboardEventInit = {}) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });

describe('useSidebarShortcut', () => {
  let items: Map<string, string>;

  beforeEach(() => {
    items = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.shortcutsEnabled = true;
  });

  const renderShortcut = () =>
    renderHook(() => {
      useSidebarShortcut();
      return useSidebarCollapsed();
    });

  it('toggles the sidebar on [.', () => {
    const { result } = renderShortcut();

    pressKey('[');
    expect(result.current.collapsed).toBe(true);
    expect(items.get(SIDEBAR_COLLAPSED_KEY)).toBe('true');

    pressKey('[');
    expect(result.current.collapsed).toBe(false);
  });

  it('toggles the sidebar on [ typed with AltGr.', () => {
    const { result } = renderShortcut();

    pressKey('[', document.body, { ctrlKey: true, altKey: true });

    expect(result.current.collapsed).toBe(true);
  });

  it('does nothing on Cmd+[.', () => {
    const { result } = renderShortcut();

    pressKey('[', document.body, { metaKey: true });

    expect(result.current.collapsed).toBe(false);
  });

  it('does nothing when the keyboard shortcuts are off.', () => {
    mocks.shortcutsEnabled = false;
    const { result } = renderShortcut();

    pressKey('[');

    expect(result.current.collapsed).toBe(false);
  });

  it('does nothing when the focus is in a text field.', () => {
    const { result } = renderShortcut();
    const input = document.createElement('input');
    document.body.append(input);

    pressKey('[', input);

    expect(result.current.collapsed).toBe(false);
    input.remove();
  });
});
