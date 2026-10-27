import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PENDING_DEVICE_STAKE_STORAGE_KEY } from '@constants/extra';

import {
  clearPendingDeviceStake,
  readPendingDeviceStake,
  writePendingDeviceStake,
} from './pendingDeviceStake';

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

describe('pendingDeviceStake', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps one unclaimed stake per device', () => {
    writePendingDeviceStake(DEVICE, { memo: '7', amount: '10' });
    writePendingDeviceStake(OTHER, { memo: '8', amount: '2' });

    expect(readPendingDeviceStake(DEVICE)).toEqual({ memo: '7', amount: '10' });
    expect(readPendingDeviceStake(OTHER)).toEqual({ memo: '8', amount: '2' });
  });

  it('clears the stake of one device and removes the key with the last one', () => {
    writePendingDeviceStake(DEVICE, { memo: '7', amount: '10' });
    writePendingDeviceStake(OTHER, { memo: '8', amount: '2' });

    clearPendingDeviceStake(DEVICE);
    expect(readPendingDeviceStake(DEVICE)).toBeUndefined();
    expect(readPendingDeviceStake(OTHER)).toEqual({ memo: '8', amount: '2' });

    clearPendingDeviceStake(OTHER);
    expect(storage.items.has(PENDING_DEVICE_STAKE_STORAGE_KEY)).toBe(false);
  });

  it('ignores a broken value', () => {
    storage.setItem(PENDING_DEVICE_STAKE_STORAGE_KEY, '{not json');

    expect(readPendingDeviceStake(DEVICE)).toBeUndefined();
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

    expect(() => writePendingDeviceStake(DEVICE, { memo: '7', amount: '10' })).not.toThrow();
    expect(readPendingDeviceStake(DEVICE)).toBeUndefined();
  });
});
