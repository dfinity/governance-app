import { AccountIdentifier, TransferError } from '@icp-sdk/canisters/ledger/icp';
import { nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getAmountRange, getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { E8Sn, ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger';
import { useDeviceAction } from '@hooks/useDeviceAction';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { bigIntMul } from '@utils/bigInt';
import { isCertifiedRejectError } from '@utils/errors';
import { duplicateTransferOf } from '@utils/errors/duplicateTransfer';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { getAnonymousNnsGovernanceCanister, getIcpLedgerCanister } from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

import {
  clearPendingDeviceTopUp,
  readPendingDeviceTopUp,
  writePendingDeviceTopUp,
} from '../utils/pendingDeviceTopUp';

type IncreaseStakeParams = {
  neuronId: bigint;
  accountIdentifier: string;
  amount: number;
  fromSubAccount?: number[];
  selectedAccountId: string;
  /** Who signs the transfer. The source account decides. Defaults to the Internet Identity session. */
  signer?: Signer;
};

// The `createdAt` of each unsettled device top-up, by its parameters. A view unmount does not
// forget it: the device can sign a cancelled transfer late, and the same top-up sent again
// must be the same ledger transaction, not a second one.
const deviceCreatedAt = new Map<string, bigint>();

const deviceTopUpKey = ({ signer, accountIdentifier, amount }: IncreaseStakeParams) =>
  [
    signer?.kind === 'ledger' ? signer.principal : '',
    accountIdentifier,
    bigIntMul(E8Sn, amount).toString(),
  ].join('|');

/**
 * Hook to increase stake on an existing neuron.
 * Following the nns-dapp pattern:
 * 1. Transfer ICP to the neuron's account identifier.
 * 2. Call claimOrRefreshNeuron to update the cached stake.
 *
 * A Ledger device account signs the transfer on the device, behind the approval dialog. The
 * device cannot sign `claim_or_refresh`, so the refresh goes through the anonymous governance
 * canister. The target neuron can belong to the session or to a device.
 */
export function useIncreaseStake() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const { canister: ledgerCanister } = useIcpLedger();
  const runDeviceAction = useDeviceAction();

  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const createdAtRef = useRef<bigint | null>(null);

  return useMutation({
    mutationFn: async (params: IncreaseStakeParams) => {
      if (!governanceCanister || !ledgerCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.increaseStake.errors.failed));
      }

      const signer = params.signer ?? II_SIGNER;
      const amountE8s = bigIntMul(E8Sn, params.amount);
      const to = AccountIdentifier.fromHex(params.accountIdentifier);

      // Use stored createdAt for retry deduplication, or generate a new one
      const key = deviceTopUpKey(params);
      const stored = signer.kind === 'ledger' ? deviceCreatedAt.get(key) : createdAtRef.current;
      const createdAt = stored ?? nowInBigIntNanoSeconds();
      if (signer.kind === 'ledger') deviceCreatedAt.set(key, createdAt);
      else createdAtRef.current = createdAt;

      if (signer.kind === 'ledger') {
        // Step 1: the device signs the transfer to the neuron's account identifier. A top-up
        // whose transfer went through retries the refresh only, from any view or session.
        if (readPendingDeviceTopUp(key) === undefined) {
          await runDeviceAction(
            (signal) =>
              runOnDevice(signer.principal, async () => {
                // A cancelled call that waited in the queue must not prompt the device.
                if (signal.aborted) return;
                const deviceLedger = await getIcpLedgerCanister({ signer });
                if (signal.aborted) return;
                try {
                  await deviceLedger.transfer({
                    to,
                    amount: amountE8s,
                    fee: ICP_TRANSACTION_FEE_E8Sn,
                    createdAt,
                  });
                } catch (error: unknown) {
                  // The device signed an earlier attempt after its dialog was cancelled. The ICP
                  // is on the neuron account, so the refresh below picks it up.
                  if (duplicateTransferOf(error) === undefined) throw error;
                }
              }),
            {
              description: t(($) => $.neuronDetailModal.increaseStake.ledgerDevice.approveTransfer),
              detail: (
                <span className="flex flex-col gap-1">
                  <span>{t(($) => $.common.inIcp, { value: params.amount })}</span>
                  <span>{params.accountIdentifier}</span>
                </span>
              ),
            },
          ).catch((error: unknown) => {
            // The ledger rejected this transfer: the next attempt is a new transaction. A
            // cancelled approval keeps its createdAt, the device can still sign it.
            if (
              (error instanceof Error && isCertifiedRejectError(error)) ||
              error instanceof TransferError
            ) {
              deviceCreatedAt.delete(key);
            }
            throw error;
          });
          writePendingDeviceTopUp(key, {
            neuronId: params.neuronId.toString(),
            amount: params.amount.toString(),
          });
        }

        // Step 2: the device cannot sign `claim_or_refresh`. Anyone can refresh a neuron by id.
        const anonymousGovernance = await getAnonymousNnsGovernanceCanister();
        await anonymousGovernance.claimOrRefreshNeuron({
          neuronId: params.neuronId,
          by: { NeuronIdOrSubaccount: {} },
        });
        clearPendingDeviceTopUp(key);
      } else {
        // Step 1: Transfer ICP to the neuron's account identifier
        await ledgerCanister.transfer({
          to,
          amount: amountE8s,
          fee: ICP_TRANSACTION_FEE_E8Sn,
          fromSubAccount: params.fromSubAccount,
          createdAt,
        });

        // Step 2: Refresh the neuron to update the cached stake
        await governanceCanister.claimOrRefreshNeuron({
          neuronId: params.neuronId,
          by: { NeuronIdOrSubaccount: {} },
        });
      }

      // Reset createdAt only after the full flow succeeds
      createdAtRef.current = null;
      deviceCreatedAt.delete(key);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, params.selectedAccountId],
        }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
      ]).catch(failedRefresh);
    },
    onSuccess: (_, params) => {
      const properties = { amount_range: getAmountRange(params.amount) };
      analytics.event(AnalyticsEvent.NeuronIncreaseStake, properties);
      if (params.signer?.kind === 'ledger') {
        analytics.event(AnalyticsEvent.LedgerDeviceTopUp, properties);
      }
    },
    onError: (error, params) => {
      const properties = { reason: getErrorReason(error) };
      analytics.event(AnalyticsEvent.NeuronIncreaseStakeError, properties);
      if (params.signer?.kind === 'ledger') {
        analytics.event(AnalyticsEvent.LedgerDeviceTopUpError, properties);
      }
    },
  });
}
