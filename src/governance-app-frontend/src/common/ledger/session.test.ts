import { Principal } from '@icp-sdk/core/principal';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { MockLedgerIdentity } from '../../../tests/mocks/ledgerIdentity';
import { clearDeviceQueues, runOnDevice } from './deviceQueue';
import { LedgerDeviceError, LedgerErrorCode } from './errors';
import { LedgerIdentity } from './ledgerIdentity';
import { clearLedgerIdentities, connectLedgerIdentity, getLedgerIdentity } from './session';

const DEVICE_PRINCIPAL = new MockLedgerIdentity().getPrincipal().toText();
const OTHER_PRINCIPAL = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

describe('getLedgerIdentity', () => {
  let create: MockInstance<typeof LedgerIdentity.create>;

  beforeEach(() => {
    create = vi
      .spyOn(LedgerIdentity, 'create')
      .mockImplementation(async () => new MockLedgerIdentity());
  });

  afterEach(() => {
    clearLedgerIdentities();
    clearDeviceQueues();
    vi.restoreAllMocks();
  });

  it('connects once and returns the device identity', async () => {
    const identity = await getLedgerIdentity(DEVICE_PRINCIPAL);

    expect(identity).toBeInstanceOf(MockLedgerIdentity);
    expect(identity.getPrincipal().toText()).toBe(DEVICE_PRINCIPAL);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('reuses the identity for the same principal', async () => {
    const first = await getLedgerIdentity(DEVICE_PRINCIPAL);
    const second = await getLedgerIdentity(DEVICE_PRINCIPAL);

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('shares one connection between parallel calls', async () => {
    const [first, second] = await Promise.all([
      getLedgerIdentity(DEVICE_PRINCIPAL),
      getLedgerIdentity(DEVICE_PRINCIPAL),
    ]);

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps one identity per principal', async () => {
    const other = Principal.fromText(OTHER_PRINCIPAL);
    create
      .mockImplementationOnce(async () => new MockLedgerIdentity())
      .mockImplementationOnce(async () => new MockLedgerIdentity({ principal: other }));

    const first = await getLedgerIdentity(DEVICE_PRINCIPAL);
    const second = await getLedgerIdentity(OTHER_PRINCIPAL);

    expect(first.getPrincipal().toText()).toBe(DEVICE_PRINCIPAL);
    expect(second.getPrincipal().toText()).toBe(OTHER_PRINCIPAL);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('throws UnexpectedDevice when another device answers', async () => {
    await expect(getLedgerIdentity(OTHER_PRINCIPAL)).rejects.toMatchObject({
      code: LedgerErrorCode.UnexpectedDevice,
      details: { expected: OTHER_PRINCIPAL, actual: DEVICE_PRINCIPAL },
    });
    await expect(getLedgerIdentity(OTHER_PRINCIPAL)).rejects.toBeInstanceOf(LedgerDeviceError);
  });

  it('does not cache a failed connection', async () => {
    create.mockRejectedValueOnce(new LedgerDeviceError(LedgerErrorCode.NoDevice));

    await expect(getLedgerIdentity(DEVICE_PRINCIPAL)).rejects.toMatchObject({
      code: LedgerErrorCode.NoDevice,
    });
    await expect(getLedgerIdentity(DEVICE_PRINCIPAL)).resolves.toBeInstanceOf(MockLedgerIdentity);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not cache a principal mismatch', async () => {
    await expect(getLedgerIdentity(OTHER_PRINCIPAL)).rejects.toMatchObject({
      code: LedgerErrorCode.UnexpectedDevice,
    });

    create.mockImplementationOnce(
      async () => new MockLedgerIdentity({ principal: Principal.fromText(OTHER_PRINCIPAL) }),
    );

    await expect(getLedgerIdentity(OTHER_PRINCIPAL)).resolves.toBeInstanceOf(MockLedgerIdentity);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('connects again after clearLedgerIdentities', async () => {
    const first = await getLedgerIdentity(DEVICE_PRINCIPAL);
    clearLedgerIdentities();
    const second = await getLedgerIdentity(DEVICE_PRINCIPAL);

    expect(second).not.toBe(first);
    expect(create).toHaveBeenCalledTimes(2);
  });

  describe('connectLedgerIdentity', () => {
    it('caches the connected device under its principal', async () => {
      const identity = await connectLedgerIdentity();

      await expect(getLedgerIdentity(DEVICE_PRINCIPAL)).resolves.toBe(identity);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('waits for the pending device calls before it connects', async () => {
      let finish!: () => void;
      void runOnDevice(DEVICE_PRINCIPAL, () => new Promise<void>((resolve) => (finish = resolve)));

      const connecting = connectLedgerIdentity();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(create).not.toHaveBeenCalled();

      finish();
      await expect(connecting).resolves.toBeInstanceOf(MockLedgerIdentity);
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('holds a device call queued during the connection until the connection settles', async () => {
      let finishCall!: () => void;
      let finishCreate!: () => void;
      void runOnDevice(
        DEVICE_PRINCIPAL,
        () => new Promise<void>((resolve) => (finishCall = resolve)),
      );
      create.mockImplementationOnce(
        () =>
          new Promise<MockLedgerIdentity>((resolve) => {
            finishCreate = () => resolve(new MockLedgerIdentity());
          }),
      );

      await vi.waitFor(() => expect(finishCall).toBeDefined());
      const connecting = connectLedgerIdentity();
      let retried = false;
      void runOnDevice(DEVICE_PRINCIPAL, async () => {
        retried = true;
      });

      finishCall();
      await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(retried).toBe(false);

      finishCreate();
      await connecting;
      await vi.waitFor(() => expect(retried).toBe(true));
    });

    it('does not seed the cache when a logout happens during the connection', async () => {
      let finish!: () => void;
      create.mockImplementationOnce(
        () =>
          new Promise<MockLedgerIdentity>((resolve) => {
            finish = () => resolve(new MockLedgerIdentity());
          }),
      );

      const connecting = connectLedgerIdentity();
      await vi.waitFor(() => expect(create).toHaveBeenCalled());
      clearLedgerIdentities();
      finish();
      await connecting;

      await getLedgerIdentity(DEVICE_PRINCIPAL);
      expect(create).toHaveBeenCalledTimes(2);
    });
  });
});
