import { beforeEach, describe, expect, it } from 'vitest';

import { clearDeviceQueues, isDeviceBusy, runOnDevice, waitForDevices } from './deviceQueue';

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

  it('waitForDevices resolves at once when no device is busy', async () => {
    await expect(waitForDevices()).resolves.toBeUndefined();
  });

  it('waitForDevices waits for every pending call', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    void runOnDevice(DEVICE, () => first.promise);
    void runOnDevice(OTHER, () => second.promise).catch(() => undefined);
    let idle = false;
    void waitForDevices().then(() => (idle = true));

    first.resolve();
    await tick();
    expect(idle).toBe(false);

    second.reject(new Error('device'));
    await tick();
    expect(idle).toBe(true);
  });
});
