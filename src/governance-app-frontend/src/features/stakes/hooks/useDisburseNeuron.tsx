import type { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
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

type DisburseNeuronParams = {
  neuronId: bigint;
  toAccountId: string;
  /** Who signs the call. The neuron controller. Defaults to the Internet Identity session. */
  signer?: Signer;
};

/**
 * Hook to disburse a dissolved neuron.
 * Transfers the neuron's stake back to the user's account.
 * A Ledger signer prompts the device for one approval.
 */
export function useDisburseNeuron() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const runLedgerCall = useLedgerNeuronCall();

  return useMutation({
    mutationFn: async ({ signer = II_SIGNER, ...params }: DisburseNeuronParams) => {
      if (!governanceCanister || !identity) {
        throw new Error(t(($) => $.neuronDetailModal.disburseIcp.errors.failed));
      }

      const disburse = (canister: NnsGovernanceCanister) =>
        canister.disburse({
          neuronId: params.neuronId,
          toAccountId: params.toAccountId,
        });

      const refresh = () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, params.toAccountId],
          }),
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        ]).catch(failedRefresh);

      if (signer.kind === 'ledger') {
        await runLedgerCall(
          async (canister) => {
            await disburse(canister);
            await refresh();
          },
          {
            principal: signer.principal,
            action: 'disburse',
            description: t(($) => $.common.ledgerApproval.disburse),
            detail: (
              <DeviceActionDetail
                lines={[
                  t(($) => $.common.ledgerApproval.neuron, { neuronId: String(params.neuronId) }),
                  t(($) => $.common.ledgerApproval.destination, {
                    destination: params.toAccountId,
                  }),
                ]}
              />
            ),
          },
        );
      } else {
        await disburse(governanceCanister);
        await refresh();
      }
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.NeuronDisburse);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.NeuronDisburseError, { reason: getErrorReason(error) });
    },
  });
}
