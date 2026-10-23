import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearDeviceQueues,
  isDeviceBusy,
  runExclusiveDeviceCall,
  runOnDevice,
} from './deviceQueue';

const DEVICE = 'aaaaa-aa';
const OTHER = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('runOnDevice', () => {
  beforeEach(() => clearDeviceQueues());

  it('runs the calls to one device in order', async () => {
    const first = deferred<string>();
    const order: string[] = [];

    const a = runOnDevice(DEVICE, () => {
      order.push('a');
      return first.promise;
    });
    const b = runOnDevice(DEVICE, async () => {
      order.push('b');
      return 'b';
    });
    await tick();

    expect(order).toEqual(['a']);
    expect(isDeviceBusy(DEVICE)).toBe(true);

    first.resolve('a');

    expect(await a).toBe('a');
    expect(await b).toBe('b');
    expect(order).toEqual(['a', 'b']);
    await tick();
    expect(isDeviceBusy(DEVICE)).toBe(false);
  });

  it('runs the next call after a failed one', async () => {
    const first = deferred<string>();

    const a = runOnDevice(DEVICE, () => first.promise);
    const b = runOnDevice(DEVICE, async () => 'b');

    first.reject(new Error('rejected'));

    await expect(a).rejects.toThrow('rejected');
    expect(await b).toBe('b');
  });

  it('keeps the devices apart', async () => {
    const first = deferred<string>();
    const order: string[] = [];

    void runOnDevice(DEVICE, () => {
      order.push('a');
      return first.promise;
    });
    const other = runOnDevice(OTHER, async () => {
      order.push('other');
      return 'other';
    });

    expect(await other).toBe('other');
    expect(order).toEqual(['a', 'other']);
    first.resolve('a');
  });

  it('runs an exclusive call at once when no device is busy', async () => {
    await expect(runExclusiveDeviceCall(async () => 'connected')).resolves.toBe('connected');
  });

  it('starts an exclusive call after every pending call settles', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    void runOnDevice(DEVICE, () => first.promise);
    void runOnDevice(OTHER, () => second.promise).catch(() => undefined);
    let started = false;
    void runExclusiveDeviceCall(async () => {
      started = true;
    });

    first.resolve();
    await tick();
    expect(started).toBe(false);

    second.reject(new Error('device'));
    await tick();
    expect(started).toBe(true);
  });

  it('holds the device calls queued after an exclusive call until it settles', async () => {
    const pending = deferred<void>();
    const connection = deferred<void>();
    void runOnDevice(DEVICE, () => pending.promise);
    void runExclusiveDeviceCall(() => connection.promise).catch(() => undefined);
    const order: string[] = [];
    void runOnDevice(DEVICE, async () => {
      order.push('retry');
    });
    void runOnDevice(OTHER, async () => {
      order.push('other');
    });

    pending.resolve();
    await tick();
    expect(order).toEqual([]);

    connection.reject(new Error('cancelled'));
    await tick();
    expect(order).toEqual(['retry', 'other']);
  });

  it('runs the exclusive calls in order', async () => {
    const first = deferred<void>();
    const order: string[] = [];
    void runExclusiveDeviceCall(() => {
      order.push('a');
      return first.promise;
    });
    void runExclusiveDeviceCall(async () => {
      order.push('b');
    });

    await tick();
    expect(order).toEqual(['a']);

    first.resolve();
    await tick();
    expect(order).toEqual(['a', 'b']);
  });
});
