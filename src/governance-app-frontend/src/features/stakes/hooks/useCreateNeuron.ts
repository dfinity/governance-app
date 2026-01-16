import { nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { E8Sn, ICP_TRANSACTION_FEE_E8Sn, SECONDS_IN_MONTH } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger';
import { bigIntMul } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { QUERY_KEYS } from '@utils/query';

import { StakingWizardCreateNeuronStep } from '../components/stakingWizard/types';

interface Props {
  amount: string;
  dissolveDelayMonths: number;
  autoStakeMaturity: boolean;
  startDissolving: boolean;
}

/**
 * Hook to manage the neuron creation process
 * Handles multi-step creation with retry capability from failed step
 *
 * @param params Props - configuration for the new neuron
 * @returns
 *   - execute: function to start/retry the creation process
 *   - reset: function to reset the hook state
 *   - isProcessing: boolean - indicates if creation is in progress
 *   - error: string | null - error message if failed
 *   - currentStep: StakingWizardCreateNeuronStep - current/failed step for progress display
 */
export function useCreateNeuron(params: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const { canister: ledgerCanister } = useIcpLedger();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StakingWizardCreateNeuronStep>(
    StakingWizardCreateNeuronStep.CreateNeuron,
  );
  const [createdNeuronId, setCreatedNeuronId] = useState<bigint | null>(null);

  const reset = () => {
    setIsProcessing(false);
    setError(null);
    setCurrentStep(StakingWizardCreateNeuronStep.CreateNeuron);
    setCreatedNeuronId(null);
  };

  const execute = async () => {
    if (!governanceCanister || !ledgerCanister || !identity) {
      setError(t(($) => $.stakeWizardModal.errors.stakeFailed));
      return;
    }

    setIsProcessing(true);
    setError(null);

    let neuronId = createdNeuronId;

    try {
      // Step 1: Create neuron
      if (currentStep <= StakingWizardCreateNeuronStep.CreateNeuron) {
        setCurrentStep(StakingWizardCreateNeuronStep.CreateNeuron);

        const stake = bigIntMul(E8Sn, Number(params.amount));
        const principal = identity.getPrincipal();

        neuronId = await governanceCanister.stakeNeuron({
          stake,
          principal,
          ledgerCanister,
          createdAt: nowInBigIntNanoSeconds(),
          fee: ICP_TRANSACTION_FEE_E8Sn,
        });
        setCreatedNeuronId(neuronId);
      }

      if (!neuronId) {
        throw new Error('Neuron ID not available.');
      }

      // Step 2: Set dissolve delay
      if (currentStep <= StakingWizardCreateNeuronStep.SetDissolveDelay) {
        setCurrentStep(StakingWizardCreateNeuronStep.SetDissolveDelay);

        const dissolveDelaySeconds =
          Math.floor(Date.now() / 1000) + params.dissolveDelayMonths * SECONDS_IN_MONTH;
        await governanceCanister.setDissolveDelay({
          neuronId,
          dissolveDelaySeconds,
        });
      }

      // Step 3: Set auto-stake maturity (if enabled)
      if (currentStep <= StakingWizardCreateNeuronStep.SetAutoStakeMaturity) {
        if (params.autoStakeMaturity) {
          setCurrentStep(StakingWizardCreateNeuronStep.SetAutoStakeMaturity);

          await governanceCanister.autoStakeMaturity({
            neuronId,
            autoStake: true,
          });
        }
      }

      // Step 4: Start dissolving (if enabled)
      if (currentStep <= StakingWizardCreateNeuronStep.StartDissolving) {
        if (params.startDissolving) {
          setCurrentStep(StakingWizardCreateNeuronStep.StartDissolving);

          await governanceCanister.startDissolving(neuronId);
        }
      }

      setCurrentStep(StakingWizardCreateNeuronStep.Done);
    } catch (err) {
      // Keep currentStep at the failed step for retry
      setError(mapGovernanceCanisterError(err as Error));
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS] }),
      ]);

      setIsProcessing(false);
    }
  };

  // Block navigation while processing
  useBlocker({
    shouldBlockFn: () => {
      if (!isProcessing) return false;
      window.alert(t(($) => $.stakeWizardModal.confirmNavigation));
      return true;
    },
    enableBeforeUnload: isProcessing,
  });

  return {
    execute,
    reset,
    isProcessing,
    error,
    currentStep,
  };
}
