import { afterEach, describe, expect, it, vi } from 'vitest';

import { canUseLocalStorage, getStorageItem, setStorageItem } from './storage';

const denyStorage = () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    },
  });

  return () => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
};

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads and writes the storage when the browser allows it.', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });

    expect(canUseLocalStorage()).toBe(true);
    setStorageItem('key', 'value');
    expect(getStorageItem('key')).toBe('value');
    expect(getStorageItem('other')).toBeNull();
  });

  it('reports no storage and reads nothing when the browser denies it.', () => {
    const restore = denyStorage();

    try {
      expect(canUseLocalStorage()).toBe(false);
      expect(getStorageItem('key')).toBeNull();
      expect(() => setStorageItem('key', 'value')).not.toThrow();
    } finally {
      restore();
    }
  });
});
