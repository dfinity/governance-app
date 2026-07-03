import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useNnsGovernance } from '@hooks/governance';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

export type DisburseMaturityDestination =
  | { kind: 'icp'; accountIdentifier: string }
  | { kind: 'icrc1'; owner: Principal; subaccount?: Uint8Array };

type DisburseMaturityParams = {
  neuronId: bigint;
  destination: DisburseMaturityDestination;
};

// Only 32-byte subaccounts are valid; treat anything else as the default subaccount so the
// forwarded destination and the balance-invalidation key stay in sync.
const normalizeIcrcSubaccount = (subaccount?: Uint8Array): Uint8Array | undefined =>
  subaccount && subaccount.length === 32 ? subaccount : undefined;

const resolveDestinationAccountId = (destination: DisburseMaturityDestination): string => {
  if (destination.kind === 'icp') return destination.accountIdentifier;
  const subaccount = normalizeIcrcSubaccount(destination.subaccount);
  const subAccount = subaccount ? SubAccount.fromBytes(subaccount) : undefined;
  return AccountIdentifier.fromPrincipal({ principal: destination.owner, subAccount }).toHex();
};

/**
 * Hook to disburse maturity from a neuron.
 * Initiates the conversion of maturity to ICP (takes ~1 week).
 * Disburses 100% of available maturity.
 */
export function useDisburseMaturity() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();

  return useMutation({
    mutationFn: async (params: DisburseMaturityParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.disburseMaturity.errors.failed));
      }

      const { destination } = params;

      if (destination.kind === 'icp') {
        await governanceCanister.disburseMaturity({
          neuronId: params.neuronId,
          percentageToDisburse: 100,
          toAccountIdentifier: destination.accountIdentifier,
        });
      } else {
        const subaccount = normalizeIcrcSubaccount(destination.subaccount);
        await governanceCanister.disburseMaturity({
          neuronId: params.neuronId,
          percentageToDisburse: 100,
          toAccount: {
            owner: destination.owner,
            subaccount: subaccount ? Array.from(subaccount) : undefined,
          },
        });
      }

      const destinationAccountId = resolveDestinationAccountId(destination);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, destinationAccountId],
        }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
      ]).catch(failedRefresh);
    },
  });
}
