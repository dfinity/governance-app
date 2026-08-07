import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@utils/query';

import { useDisburseMaturity } from './useDisburseMaturity';

// ─── Module mocks ────────────────────────────────────────────────

const disburseMaturity = vi.fn().mockResolvedValue(undefined);

vi.mock('@hooks/governance', () => ({
  useNnsGovernance: () => ({ canister: { disburseMaturity } }),
}));

vi.mock('ic-use-internet-identity', () => ({
  useInternetIdentity: () => ({ identity: { getPrincipal: () => Principal.anonymous() } }),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const OWNER = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
};

const renderDisburse = () => {
  const { wrapper, invalidateQueries } = createWrapper();
  const { result } = renderHook(() => useDisburseMaturity(), { wrapper });
  return { result, invalidateQueries };
};

const balanceKey = (accountId: string) => ({
  queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, accountId],
});

describe('useDisburseMaturity', () => {
  beforeEach(() => {
    disburseMaturity.mockClear();
  });

  describe('ICP destination', () => {
    it('forwards toAccountIdentifier and omits toAccount', async () => {
      const { result } = renderDisburse();

      await result.current.mutateAsync({
        neuronId: 1n,
        destination: { kind: 'icp', accountIdentifier: 'account-id-hex' },
      });

      expect(disburseMaturity).toHaveBeenCalledWith({
        neuronId: 1n,
        percentageToDisburse: 100,
        toAccountIdentifier: 'account-id-hex',
      });
      expect(disburseMaturity.mock.calls[0][0]).not.toHaveProperty('toAccount');
    });

    it('invalidates the balance query for the ICP account identifier', async () => {
      const { result, invalidateQueries } = renderDisburse();

      await result.current.mutateAsync({
        neuronId: 1n,
        destination: { kind: 'icp', accountIdentifier: 'account-id-hex' },
      });

      expect(invalidateQueries).toHaveBeenCalledWith(balanceKey('account-id-hex'));
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
      });
    });
  });

  describe('ICRC-1 destination', () => {
    it('forwards a structured toAccount with the subaccount as number[] and omits toAccountIdentifier', async () => {
      const { result } = renderDisburse();
      const subaccount = Uint8Array.from({ length: 32 }, (_, i) => i);

      await result.current.mutateAsync({
        neuronId: 2n,
        destination: { kind: 'icrc1', owner: OWNER, subaccount },
      });

      expect(disburseMaturity).toHaveBeenCalledWith({
        neuronId: 2n,
        percentageToDisburse: 100,
        toAccount: { owner: OWNER, subaccount: Array.from(subaccount) },
      });
      expect(disburseMaturity.mock.calls[0][0]).not.toHaveProperty('toAccountIdentifier');
    });

    it('forwards undefined subaccount when none is provided', async () => {
      const { result } = renderDisburse();

      await result.current.mutateAsync({
        neuronId: 2n,
        destination: { kind: 'icrc1', owner: OWNER },
      });

      expect(disburseMaturity).toHaveBeenCalledWith({
        neuronId: 2n,
        percentageToDisburse: 100,
        toAccount: { owner: OWNER, subaccount: undefined },
      });
    });

    it('treats a non-32-byte subaccount as the default subaccount', async () => {
      const { result } = renderDisburse();
      const shortSubaccount = Uint8Array.from({ length: 16 }, () => 7);

      await result.current.mutateAsync({
        neuronId: 2n,
        destination: { kind: 'icrc1', owner: OWNER, subaccount: shortSubaccount },
      });

      expect(disburseMaturity.mock.calls[0][0].toAccount.subaccount).toBeUndefined();
    });

    it('invalidates the balance query for the derived account identifier (with subaccount)', async () => {
      const { result, invalidateQueries } = renderDisburse();
      const subaccount = Uint8Array.from({ length: 32 }, (_, i) => i);

      await result.current.mutateAsync({
        neuronId: 2n,
        destination: { kind: 'icrc1', owner: OWNER, subaccount },
      });

      const expectedAccountId = AccountIdentifier.fromPrincipal({
        principal: OWNER,
        subAccount: SubAccount.fromBytes(subaccount) as SubAccount,
      }).toHex();

      expect(invalidateQueries).toHaveBeenCalledWith(balanceKey(expectedAccountId));
    });

    it('invalidates the balance query for the default account identifier when the subaccount is invalid', async () => {
      const { result, invalidateQueries } = renderDisburse();
      const shortSubaccount = Uint8Array.from({ length: 16 }, () => 7);

      await result.current.mutateAsync({
        neuronId: 2n,
        destination: { kind: 'icrc1', owner: OWNER, subaccount: shortSubaccount },
      });

      const expectedAccountId = AccountIdentifier.fromPrincipal({ principal: OWNER }).toHex();

      expect(invalidateQueries).toHaveBeenCalledWith(balanceKey(expectedAccountId));
    });
  });
});
