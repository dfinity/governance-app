import { Topic } from '@icp-sdk/canisters/nns';
import { nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getUsersFollowedNeurons, isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';

import { E8Sn, ICP_TRANSACTION_FEE_E8Sn, SECONDS_IN_MONTH } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger';
import { bigIntMul } from '@utils/bigInt';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

import { StakingWizardCreateNeuronStep } from '../components/stakingWizard/types';

type Props = {
  amount: string;
  dissolveDelayMonths: number;
  autoStakeMaturity: boolean;
  startDissolving: boolean;
  fromSubAccount?: number[];
};

/**
 * Hook to manage the neuron creation process
 * Handles multi-step creation with retry capability from failed step
 *
 * @param params Props - configuration for the new neuron
 * @returns
 *   - mutation properties (mutate, mutateAsync, isPending, error, reset, etc.)
 *   - currentStep: StakingWizardCreateNeuronStep - current/failed step for progress display
 *   - reset: function to reset both mutation and step state
 */
export function useCreateNeuron(params: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const { canister: ledgerCanister } = useIcpLedger();

  const [currentStep, setCurrentStep] = useState<StakingWizardCreateNeuronStep>(
    StakingWizardCreateNeuronStep.CreateNeuron,
  );
  const [createdNeuronId, setCreatedNeuronId] = useState<bigint | null>(null);
  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const [storedCreatedAt, setStoredCreatedAt] = useState<bigint | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!governanceCanister || !ledgerCanister || !identity) {
        throw new Error(t(($) => $.stakeWizardModal.errors.stakeFailed));
      }

      let neuronId = createdNeuronId;
      let step = currentStep;

      // Step 1: Create neuron
      // This is special step: the stakeNeuron call abstracts both the transfer and the claim_or_refresh_neuron.
      // If the connection drops after the transfer but before the claim, there could be a need for manual intervention.
      // At the moment we have not way to detect this and the user would need to manually claim the neuron.
      // Future ICRC2 support should fix this potential issue.
      if (step === StakingWizardCreateNeuronStep.CreateNeuron) {
        const stake = bigIntMul(E8Sn, Number(params.amount));
        const principal = identity.getPrincipal();
        const createdAt = storedCreatedAt ?? nowInBigIntNanoSeconds();
        setStoredCreatedAt(createdAt);

        neuronId = await governanceCanister.stakeNeuron({
          stake,
          principal,
          fromSubAccount: params.fromSubAccount,
          ledgerCanister,
          createdAt,
          fee: ICP_TRANSACTION_FEE_E8Sn,
        });
        setCreatedNeuronId(neuronId);
        step = StakingWizardCreateNeuronStep.SetDissolveDelay;
        setCurrentStep(step);
      }

      if (!neuronId) {
        throw new Error('Neuron ID not available.');
      }

      // Step 2: Set dissolve delay
      if (step === StakingWizardCreateNeuronStep.SetDissolveDelay) {
        const newDissolveTimestamp =
          Math.floor(Date.now() / 1000) + params.dissolveDelayMonths * SECONDS_IN_MONTH;
        await governanceCanister.setDissolveDelay({
          neuronId,
          dissolveDelaySeconds: newDissolveTimestamp,
        });
        step = StakingWizardCreateNeuronStep.SetAutoStakeMaturity;
        setCurrentStep(step);
      }

      // Step 3: Set auto-stake maturity (if enabled)
      if (step === StakingWizardCreateNeuronStep.SetAutoStakeMaturity) {
        if (params.autoStakeMaturity) {
          await governanceCanister.autoStakeMaturity({
            neuronId,
            autoStake: true,
          });
        }
        step = StakingWizardCreateNeuronStep.StartDissolving;
        setCurrentStep(step);
      }

      // Step 4: Start dissolving (if enabled)
      if (step === StakingWizardCreateNeuronStep.StartDissolving) {
        if (params.startDissolving) {
          await governanceCanister.startDissolving(neuronId);
        }
        step = StakingWizardCreateNeuronStep.SetFollowing;
        setCurrentStep(step);
      }

      // Step 5: Set following automatically (if all existing neurons follow the same single neuron)
      if (step === StakingWizardCreateNeuronStep.SetFollowing) {
        const userNeurons = await governanceCanister.listNeurons({
          includeEmptyNeurons: true,
          includePublicNeurons: true,
          certified: true,
        });

        const otherNeurons = userNeurons.filter((n) => n.neuronId !== neuronId);

        if (otherNeurons.length > 0) {
          // Check if all existing neurons follow the same single neuron
          const followedNeurons = getUsersFollowedNeurons({
            userNeurons: otherNeurons,
            knownNeurons: [],
          });

          if (followedNeurons.length === 1 && nonNullish(followedNeurons[0])) {
            const followeeId = isKnownNeuron(followedNeurons[0])
              ? followedNeurons[0].id
              : followedNeurons[0];

            await governanceCanister.setFollowing({
              neuronId,
              topicFollowing: [
                { topic: Topic.Unspecified, followees: [followeeId] },
                { topic: Topic.Governance, followees: [followeeId] },
                { topic: Topic.SnsAndCommunityFund, followees: [followeeId] },
              ],
            });
          }
        }

        step = StakingWizardCreateNeuronStep.Done;
        setCurrentStep(step);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS] }),
      ]).catch(failedRefresh);
    },
  });

  const reset = () => {
    mutation.reset();
    setCurrentStep(StakingWizardCreateNeuronStep.CreateNeuron);
    setCreatedNeuronId(null);
    setStoredCreatedAt(null);
  };

  return {
    ...mutation,
    currentStep,
    reset,
  };
}
