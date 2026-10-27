import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PENDING_DEVICE_TOP_UP_STORAGE_KEY } from '@constants/extra';

import {
  clearPendingDeviceTopUp,
  readPendingDeviceTopUp,
  writePendingDeviceTopUp,
} from './pendingDeviceTopUp';

const DEVICE = 'aaaaa-aa';
const OTHER = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

/** An in-memory `localStorage`: the one of the test environment has no `setItem`. */
const createStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
    items,
  };
};

describe('pendingDeviceTopUp', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps one pending refresh per transfer key', () => {
    writePendingDeviceTopUp(DEVICE, { neuronId: '7', amount: '10' });
    writePendingDeviceTopUp(OTHER, { neuronId: '8', amount: '2' });

    expect(readPendingDeviceTopUp(DEVICE)).toEqual({ neuronId: '7', amount: '10' });
    expect(readPendingDeviceTopUp(OTHER)).toEqual({ neuronId: '8', amount: '2' });
  });

  it('clears one top-up and removes the key with the last one', () => {
    writePendingDeviceTopUp(DEVICE, { neuronId: '7', amount: '10' });
    writePendingDeviceTopUp(OTHER, { neuronId: '8', amount: '2' });

    clearPendingDeviceTopUp(DEVICE);
    expect(readPendingDeviceTopUp(DEVICE)).toBeUndefined();
    expect(readPendingDeviceTopUp(OTHER)).toEqual({ neuronId: '8', amount: '2' });

    clearPendingDeviceTopUp(OTHER);
    expect(storage.items.has(PENDING_DEVICE_TOP_UP_STORAGE_KEY)).toBe(false);
  });

  it('ignores a broken value', () => {
    storage.setItem(PENDING_DEVICE_TOP_UP_STORAGE_KEY, '{not json');

    expect(readPendingDeviceTopUp(DEVICE)).toBeUndefined();
  });

  it('survives a blocked storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(() => writePendingDeviceTopUp(DEVICE, { neuronId: '7', amount: '10' })).not.toThrow();
    expect(readPendingDeviceTopUp(DEVICE)).toBeUndefined();
  });
});
