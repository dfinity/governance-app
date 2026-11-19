import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMAND_PALETTE_RECENT_STORAGE_KEY } from '@constants/extra';

import { addRecentCommand, readRecentCommands } from './recentCommands';

describe('recentCommands', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads no ids from an empty storage.', () => {
    expect(readRecentCommands()).toEqual([]);
  });

  it('puts the last id first and keeps each id one time.', () => {
    addRecentCommand('a');
    addRecentCommand('b');
    addRecentCommand('a');

    expect(readRecentCommands()).toEqual(['a', 'b']);
  });

  it('keeps the last five ids.', () => {
    for (const id of ['1', '2', '3', '4', '5', '6']) addRecentCommand(id);

    expect(readRecentCommands()).toEqual(['6', '5', '4', '3', '2']);
  });

  it.each([['not json'], ['{"a":1}'], ['"text"']])('reads no ids from %s.', (value) => {
    store.set(COMMAND_PALETTE_RECENT_STORAGE_KEY, value);

    expect(readRecentCommands()).toEqual([]);
  });

  it('skips the entries that are not strings.', () => {
    store.set(COMMAND_PALETTE_RECENT_STORAGE_KEY, JSON.stringify(['a', 1, null, 'b']));

    expect(readRecentCommands()).toEqual(['a', 'b']);
  });

  it('does not throw when the browser denies the storage.', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      },
    });

    expect(() => addRecentCommand('a')).not.toThrow();
    expect(readRecentCommands()).toEqual([]);
  });
});
