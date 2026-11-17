import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLoginHandoffActive } from '@common/auth/loginHandoff';

import { useCommandPaletteShortcut } from './useCommandPaletteShortcut';

vi.mock('@hooks/useCommandPaletteSettings', () => ({
  useCommandPaletteSettings: () => ({ enabled: true }),
}));

const pressCommandK = () =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

describe('useCommandPaletteShortcut', () => {
  afterEach(() => {
    setLoginHandoffActive(false);
  });

  it('opens the palette on Cmd+K.', () => {
    const onTrigger = vi.fn();
    renderHook(() => useCommandPaletteShortcut(onTrigger));

    pressCommandK();

    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it('waits while the login hand-off frame covers the page.', () => {
    const onTrigger = vi.fn();
    renderHook(() => useCommandPaletteShortcut(onTrigger));
    setLoginHandoffActive(true);

    pressCommandK();

    expect(onTrigger).not.toHaveBeenCalled();
  });
});
