import { Principal } from '@icp-sdk/core/principal';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@utils/query';

import { certifiedQueryKey } from './certified';
import { fetchRegisteredDevicePrincipals } from './nnsDapp';

const mocks = vi.hoisted(() => ({ getAccount: vi.fn() }));

vi.mock('@common/canisters', () => ({
  getNnsDappActor: () => Promise.resolve({ get_account: mocks.getAccount }),
}));

const OLD_DEVICE = 'aaaaa-aa';
const NEW_DEVICE = '2vxsx-fae';

const account = (principals: string[]) => ({
  Ok: {
    hardware_wallet_accounts: principals.map((principal) => ({
      principal: Principal.fromText(principal),
    })),
  },
});

describe('fetchRegisteredDevicePrincipals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the principals of the registered devices', async () => {
    mocks.getAccount.mockResolvedValue(account([OLD_DEVICE]));

    await expect(fetchRegisteredDevicePrincipals(new QueryClient())).resolves.toEqual([OLD_DEVICE]);
  });

  it('returns no principal when NNS dapp has no account', async () => {
    mocks.getAccount.mockResolvedValue({ AccountNotFound: null });

    await expect(fetchRegisteredDevicePrincipals(new QueryClient())).resolves.toEqual([]);
  });

  it('refreshes an invalidated device list', async () => {
    const queryClient = new QueryClient();
    mocks.getAccount.mockResolvedValue(account([OLD_DEVICE]));
    await fetchRegisteredDevicePrincipals(queryClient);

    mocks.getAccount.mockResolvedValue(account([OLD_DEVICE, NEW_DEVICE]));
    await queryClient.invalidateQueries({
      queryKey: certifiedQueryKey([QUERY_KEYS.NNS_DAPP.ACCOUNT]),
      refetchType: 'none',
    });

    await expect(fetchRegisteredDevicePrincipals(queryClient)).resolves.toEqual([
      OLD_DEVICE,
      NEW_DEVICE,
    ]);
  });
});
