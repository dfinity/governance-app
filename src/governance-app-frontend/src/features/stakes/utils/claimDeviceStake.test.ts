import { UnrecognizedTypeError } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { claimDeviceStake } from './claimDeviceStake';

const mocks = vi.hoisted(() => ({
  claimOrRefreshNeuronFromAccount: vi.fn(),
  getAnonymousNnsGovernanceCanister: vi.fn(),
}));

vi.mock('@common/canisters', () => ({
  getAnonymousNnsGovernanceCanister: mocks.getAnonymousNnsGovernanceCanister,
}));

const controller = Principal.fromText('aaaaa-aa');

describe('claimDeviceStake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAnonymousNnsGovernanceCanister.mockResolvedValue({
      claimOrRefreshNeuronFromAccount: mocks.claimOrRefreshNeuronFromAccount,
    });
  });

  it('claims with the anonymous governance canister', async () => {
    mocks.claimOrRefreshNeuronFromAccount.mockResolvedValue(42n);

    await expect(claimDeviceStake({ controller, memo: 7n })).resolves.toBe(42n);
    expect(mocks.claimOrRefreshNeuronFromAccount).toHaveBeenCalledWith({ controller, memo: 7n });
  });

  it('answers no neuron when the sub-account holds not enough funds', async () => {
    mocks.claimOrRefreshNeuronFromAccount.mockRejectedValue(
      new UnrecognizedTypeError(
        'Unrecognized ClaimOrRefresh error in {"command":[{"Error":{"error_message":"not enough funds","error_type":14}}]}',
      ),
    );

    await expect(claimDeviceStake({ controller, memo: 7n })).resolves.toBeUndefined();
  });

  it('throws on another governance error, resources exhausted included: the sub-account may still hold the ICP', async () => {
    mocks.claimOrRefreshNeuronFromAccount.mockRejectedValue(
      new UnrecognizedTypeError(
        'Unrecognized ClaimOrRefresh error in {"command":[{"Error":{"error_message":"resources exhausted","error_type":10}}]}',
      ),
    );

    await expect(claimDeviceStake({ controller, memo: 7n })).rejects.toBeInstanceOf(
      UnrecognizedTypeError,
    );
  });

  it('throws when the call failed', async () => {
    mocks.claimOrRefreshNeuronFromAccount.mockRejectedValue(new Error('offline'));

    await expect(claimDeviceStake({ controller, memo: 7n })).rejects.toThrow('offline');
  });
});
