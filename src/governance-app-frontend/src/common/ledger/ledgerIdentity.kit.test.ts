import { describe, expect, it, vi } from 'vitest';

import { LedgerIdentity } from './ledgerIdentity';

// Own file: the kit cache lives in the module, so this file starts with no kit.
const mockBuild = vi.hoisted(() => vi.fn());
vi.mock('@ledgerhq/device-management-kit', () => ({
  DeviceManagementKitBuilder: class {
    addTransport() {
      return this;
    }
    build() {
      return mockBuild();
    }
  },
}));
vi.mock('@ledgerhq/device-transport-kit-web-hid', () => ({ webHidTransportFactory: vi.fn() }));

describe('LedgerIdentity.getDeviceManagementKit', () => {
  it('forgets a failed build and succeeds on the next call', async () => {
    const kit = { isEnvironmentSupported: () => true };
    mockBuild.mockImplementationOnce(() => {
      throw new Error('no kit');
    });
    mockBuild.mockImplementation(() => kit);

    const failing = Promise.all([
      LedgerIdentity.getDeviceManagementKit(),
      LedgerIdentity.getDeviceManagementKit(),
    ]);
    await expect(failing).rejects.toThrow('no kit');
    expect(mockBuild).toHaveBeenCalledTimes(1);

    await expect(LedgerIdentity.getDeviceManagementKit()).resolves.toBe(kit);
    await expect(LedgerIdentity.getDeviceManagementKit()).resolves.toBe(kit);
    expect(mockBuild).toHaveBeenCalledTimes(2);
  });
});
