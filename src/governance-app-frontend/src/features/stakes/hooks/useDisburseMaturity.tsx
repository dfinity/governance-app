import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import { DeviceActionDetail } from '@features/ledger/components/DeviceActionDetail';

import { useNnsGovernance } from '@hooks/governance';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

import { useLedgerNeuronCall } from './useLedgerNeuronCall';

export type DisburseMaturityDestination =
  | { kind: 'icp'; accountIdentifier: string }
  | { kind: 'icrc1'; owner: Principal; subaccount?: Uint8Array };

type DisburseMaturityParams = {
  neuronId: bigint;
  destination: DisburseMaturityDestination;
  // Integer 1-100; the canister converts this share of the neuron's maturity to ICP.
  percentageToDisburse: number;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
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

// The destination as the device shows it: the account identifier, or the ICRC-1 account.
const formatDestination = (destination: DisburseMaturityDestination): string =>
  destination.kind === 'icp'
    ? destination.accountIdentifier
    : encodeIcrcAccount({
        owner: destination.owner,
        subaccount: normalizeIcrcSubaccount(destination.subaccount),
      });

/**
 * Hook to disburse maturity from a neuron.
 * Initiates the conversion of maturity to ICP (takes ~1 week).
 * Disburses the given percentage (1-100) of the neuron's available maturity.
 * A Ledger signer prompts the device for one approval.
 */
export function useDisburseMaturity() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const runLedgerCall = useLedgerNeuronCall();

  return useMutation({
    mutationFn: async ({ signer = II_SIGNER, ...params }: DisburseMaturityParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.disburseMaturity.errors.failed));
      }

      const { destination } = params;
      // The canister expects an integer 1-100; clamp defensively so no call site can
      // forward an out-of-range or fractional percentage.
      const percentageToDisburse = Math.min(
        100,
        Math.max(1, Math.round(params.percentageToDisburse)),
      );

      const disburseMaturity = (canister: NnsGovernanceCanister) => {
        if (destination.kind === 'icp') {
          return canister.disburseMaturity({
            neuronId: params.neuronId,
            percentageToDisburse,
            toAccountIdentifier: destination.accountIdentifier,
          });
        }
        const subaccount = normalizeIcrcSubaccount(destination.subaccount);
        return canister.disburseMaturity({
          neuronId: params.neuronId,
          percentageToDisburse,
          toAccount: {
            owner: destination.owner,
            subaccount: subaccount ? Array.from(subaccount) : undefined,
          },
        });
      };

      const refresh = () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE,
              resolveDestinationAccountId(destination),
            ],
          }),
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        ]).catch(failedRefresh);

      if (signer.kind === 'ledger') {
        await runLedgerCall(
          async (canister) => {
            await disburseMaturity(canister);
            await refresh();
          },
          {
            principal: signer.principal,
            action: 'disburse_maturity',
            description: t(($) => $.common.ledgerApproval.disburseMaturity),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(params.neuronId) }),
                  t(($) => $.common.ledgerApproval.percentage, { value: percentageToDisburse }),
                  t(($) => $.common.ledgerApproval.destination, {
                    destination: formatDestination(destination),
                  }),
                ]}
              />
            ),
          },
        );
      } else {
        await disburseMaturity(governanceCanister);
        await refresh();
      }
    },
    onSuccess: (_, params) => {
      analytics.event(AnalyticsEvent.NeuronDisburseMaturity, {
        destination: params.destination.kind,
        percentage: [25, 50, 75, 100].includes(params.percentageToDisburse)
          ? String(params.percentageToDisburse)
          : 'custom',
      });
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronDisburseMaturityError, {
        reason: getErrorReason(error),
      });
    },
  });
}
