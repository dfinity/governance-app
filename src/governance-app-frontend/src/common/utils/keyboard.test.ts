import { afterEach, describe, expect, it } from 'vitest';

import { setLoginHandoffActive } from '@common/auth/loginHandoff';

import { shouldIgnoreKeyboardShortcut } from './keyboard';

const keyOnBody = (key: string) => {
  const event = new KeyboardEvent('keydown', { key });
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
});
