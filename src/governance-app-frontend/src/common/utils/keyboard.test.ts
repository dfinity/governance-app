import { afterEach, describe, expect, it } from 'vitest';

import { setLoginHandoffActive } from '@common/auth/loginHandoff';

import { shouldIgnoreKeyboardShortcut } from './keyboard';

const keyOnBody = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, ...init });
  Object.defineProperty(event, 'target', { value: document.body });
  return event;
};

describe('shouldIgnoreKeyboardShortcut', () => {
  afterEach(() => {
    setLoginHandoffActive(false);
  });

  it('accepts a plain key on the page.', () => {
    expect(shouldIgnoreKeyboardShortcut(keyOnBody('d'))).toBe(false);
  });

  it('ignores every key while the login hand-off frame covers the page.', () => {
    setLoginHandoffActive(true);

    expect(shouldIgnoreKeyboardShortcut(keyOnBody('d'))).toBe(true);
  });

  it('ignores a key with Alt.', () => {
    expect(shouldIgnoreKeyboardShortcut(keyOnBody('[', { altKey: true }))).toBe(true);
  });

  describe('with layout modifiers', () => {
    const options = { layoutModifiers: true };

    it.each([
      ['AltGr on Windows', { ctrlKey: true, altKey: true }],
      ['Option on macOS', { altKey: true }],
      ['Shift', { shiftKey: true }],
    ])('accepts a key typed with %s.', (_, init) => {
      expect(shouldIgnoreKeyboardShortcut(keyOnBody('[', init), options)).toBe(false);
    });

    it.each([
      ['Ctrl', { ctrlKey: true }],
      ['Cmd', { metaKey: true }],
    ])('ignores a key with %s.', (_, init) => {
      expect(shouldIgnoreKeyboardShortcut(keyOnBody('[', init), options)).toBe(true);
    });
  });
});
