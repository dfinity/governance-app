import { describe, expect, it, vi } from 'vitest';

import { LedgerErrorCode } from './errors';
import { LedgerIdentity } from './ledgerIdentity';

// The real `@zondax/ledger-icp` app and `DMKTransport` adapter run here. Only the kit is mocked,
// so the test covers how a DMK failure travels through the adapter and the app.
const mockDmk = vi.hoisted(() => ({
  isEnvironmentSupported: vi.fn(() => true),
  listenToAvailableDevices: vi.fn(),
  startDiscovering: vi.fn(),
  connect: vi.fn(async () => 'session-id'),
  disconnect: vi.fn(async () => undefined),
  sendApdu: vi.fn(),
}));
vi.mock('@ledgerhq/device-management-kit', () => ({
  DeviceManagementKitBuilder: class {
    addTransport() {
      return this;
    }
    build() {
      return mockDmk;
    }
  },
}));
vi.mock('@ledgerhq/device-transport-kit-web-hid', () => ({ webHidTransportFactory: vi.fn() }));

describe('LedgerIdentity with the real Zondax adapter', () => {
  it.each([
    ['DeviceDisconnectedWhileSendingError', LedgerErrorCode.Disconnected],
    ['DeviceSessionNotFound', LedgerErrorCode.Disconnected],
    ['DeviceLockedError', LedgerErrorCode.Locked],
  ])('reports a %s from the kit as %s', async (tag, code) => {
    const { of } = await import('rxjs');
    mockDmk.listenToAvailableDevices.mockReturnValue(of([{ id: 'device-id' }]));
    mockDmk.sendApdu.mockRejectedValue({ _tag: tag });

    await expect(LedgerIdentity.create()).rejects.toMatchObject({ code });
    expect(mockDmk.disconnect).toHaveBeenCalledWith({ sessionId: 'session-id' });
  });
});
