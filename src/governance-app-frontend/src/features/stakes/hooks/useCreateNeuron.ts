import { TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';
import { CouldNotClaimNeuronError, type NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { isNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getAmountRange, getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import {
  buildAdvancedTopicFollowing,
  getConsistentTopicFollowees,
} from '@features/voting/utils/topicFollowing';

import { E8Sn, ICP_TRANSACTION_FEE_E8Sn, SECONDS_IN_DAY } from '@constants/extra';
import { useNnsGovernance } from '@hooks/governance';
import { useIcpLedger } from '@hooks/icpLedger';
import { useDeviceAction } from '@hooks/useDeviceAction';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { bigIntMul } from '@utils/bigInt';
import { formatDissolveDelay } from '@utils/neuron';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import {
  getAnonymousNnsGovernanceCanister,
  getIcpLedgerCanister,
  getNnsGovernanceCanister,
} from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';
import { getLedgerIdentity } from '@common/ledger/session';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

import { StakingWizardCreateNeuronStep } from '../components/stakingWizard/types';
import { createStakeMemo, getStakeAccountIdentifier } from '../utils/ledgerStake';

type Props = {
  amount: string;
  dissolveDelaySeconds: number;
  autoStakeMaturity: boolean;
  startDissolving: boolean;
  fromSubAccount?: number[];
  selectedAccountId: string;
  /** Who signs the stake. The source account decides. Defaults to the Internet Identity session. */
  signer?: Signer;
};

type DeviceActionOptions = { description: ReactNode; detail?: ReactNode };

/**
 * Hook to manage the neuron creation process
 * Handles multi-step creation with retry capability from failed step
 *
 * With a Ledger signer, the device signs the stake transfer (with the stake flag, so the
 * device shows a stake screen), the anonymous governance canister claims the neuron, the
 * device adds the Internet Identity principal as hotkey, and the device signs the
 * controller-only steps (dissolve delay, auto-stake, dissolving). Following keeps the hotkey.
 * Each device call runs behind the approval dialog and in the device queue.
 *
 * @param params Props - configuration for the new neuron
 * @returns
 *   - mutation properties (mutate, mutateAsync, isPending, error, reset, etc.)
 *   - currentStep: StakingWizardCreateNeuronStep - current/failed step for progress display
 *   - isTransferDone: true once the device transfer went through and the claim is still pending
 *   - reset: function to reset both mutation and step state
 */
export function useCreateNeuron(params: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister: governanceCanister } = useNnsGovernance();
  const { canister: ledgerCanister } = useIcpLedger();
  const runDeviceAction = useDeviceAction();
  const signer = params.signer ?? II_SIGNER;

  const [currentStep, setCurrentStep] = useState<StakingWizardCreateNeuronStep>(
    StakingWizardCreateNeuronStep.CreateNeuron,
  );
  const [createdNeuronId, setCreatedNeuronId] = useState<bigint | null>(null);
  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const [storedCreatedAt, setStoredCreatedAt] = useState<bigint | null>(null);
  // Device stake: the memo names the sub-account. A retry after a failed claim reuses it.
  const [storedMemo, setStoredMemo] = useState<bigint | null>(null);
  const [isTransferDone, setIsTransferDone] = useState(false);

  /** Runs a device call behind the approval dialog, in the queue of the device. */
  const onDevice = <T>(
    principal: string,
    call: () => Promise<T>,
    options: DeviceActionOptions,
  ): Promise<T | undefined> =>
    runDeviceAction(
      (signal) =>
        runOnDevice(principal, async () => {
          // A cancelled call that waited in the queue must not prompt the device.
          if (signal.aborted) return undefined;
          return call();
        }),
      options,
    );

  /** Runs a controller-only call: on the device for a Ledger signer, with the session otherwise. */
  const asController = (
    canister: NnsGovernanceCanister,
    call: (canister: NnsGovernanceCanister) => Promise<void>,
    options: DeviceActionOptions,
  ): Promise<void | undefined> =>
    signer.kind === 'ledger'
      ? onDevice(
          signer.principal,
          async () => call(await getNnsGovernanceCanister({ signer })),
          options,
        )
      : call(canister);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!governanceCanister || !ledgerCanister || !identity) {
        throw new Error(t(($) => $.stakeWizardModal.errors.stakeFailed));
      }

      let neuronId = createdNeuronId;
      let step = currentStep;
      const amountText = t(($) => $.common.inIcp, { value: params.amount });

      // Step 1: Create neuron
      // This is special step: the stakeNeuron call abstracts both the transfer and the claim_or_refresh_neuron.
      // If the connection drops after the transfer but before the claim, there could be a need for manual intervention.
      // At the moment we have not way to detect this and the user would need to manually claim the neuron.
      // Future ICRC2 support should fix this potential issue.
      if (step === StakingWizardCreateNeuronStep.CreateNeuron) {
        const stake = bigIntMul(E8Sn, Number(params.amount));
        const createdAt = storedCreatedAt ?? nowInBigIntNanoSeconds();
        setStoredCreatedAt(createdAt);

        if (signer.kind === 'ledger') {
          // The device signs the transfer and cannot sign the claim. The two calls are
          // separate, so a failed claim keeps the memo and retries without a second transfer.
          const controller = Principal.fromText(signer.principal);
          const memo = storedMemo ?? createStakeMemo();
          setStoredMemo(memo);

          if (!isTransferDone) {
            await onDevice(
              signer.principal,
              async () => {
                const deviceIdentity = await getLedgerIdentity(signer.principal);
                const deviceLedger = await getIcpLedgerCanister({ signer });
                // Set right before the call, so a failure before the signature does not leak
                // the stake screen into the next transfer.
                deviceIdentity.flagUpcomingStakeNeuron();
                try {
                  await deviceLedger.transfer({
                    memo,
                    amount: stake,
                    to: getStakeAccountIdentifier({ controller, memo }),
                    createdAt,
                    fee: ICP_TRANSACTION_FEE_E8Sn,
                  });
                } catch (error: unknown) {
                  // The device signed an earlier attempt after its dialog was cancelled.
                  if (!(error instanceof TxDuplicateError)) throw error;
                }
              },
              {
                description: t(($) => $.stakeWizardModal.ledgerDevice.approve.transfer),
                detail: amountText,
              },
            );
            setIsTransferDone(true);
          }

          const anonymousGovernance = await getAnonymousNnsGovernanceCanister();
          neuronId =
            (await anonymousGovernance.claimOrRefreshNeuronFromAccount({
              controller,
              memo,
            })) ?? null;
          if (isNullish(neuronId)) throw new CouldNotClaimNeuronError();
          setIsTransferDone(false);
          step = StakingWizardCreateNeuronStep.AddHotkey;
        } else {
          neuronId = await governanceCanister.stakeNeuron({
            stake,
            principal: identity.getPrincipal(),
            fromSubAccount: params.fromSubAccount,
            ledgerCanister,
            createdAt,
            fee: ICP_TRANSACTION_FEE_E8Sn,
          });
          step = StakingWizardCreateNeuronStep.SetDissolveDelay;
        }
        setCreatedNeuronId(neuronId);
        setCurrentStep(step);
      }

      if (!neuronId) {
        throw new Error('Neuron ID not available.');
      }
      const id = neuronId;

      // Step 1b (Ledger device only): the device adds this app as hotkey, so the neuron shows in
      // the neurons list and the following step can sign with the session.
      if (step === StakingWizardCreateNeuronStep.AddHotkey) {
        const hotkey = identity.getPrincipal();
        await asController(
          governanceCanister,
          (canister) => canister.addHotkey({ neuronId: id, principal: hotkey }),
          {
            description: t(($) => $.stakeWizardModal.ledgerDevice.approve.hotkey),
            detail: hotkey.toText(),
          },
        );
        step = StakingWizardCreateNeuronStep.SetDissolveDelay;
        setCurrentStep(step);
      }

      // Step 2: Set dissolve delay
      // New neurons start with a default 7-day dissolve delay, so subtract it
      if (step === StakingWizardCreateNeuronStep.SetDissolveDelay) {
        const defaultDelay = SECONDS_IN_DAY * 7;
        const targetDelay = params.dissolveDelaySeconds;
        const additionalDissolveDelaySeconds = Math.max(targetDelay - defaultDelay, 0);
        await asController(
          governanceCanister,
          (canister) =>
            canister.increaseDissolveDelay({ neuronId: id, additionalDissolveDelaySeconds }),
          {
            description: t(($) => $.stakeWizardModal.ledgerDevice.approve.dissolveDelay),
            detail: formatDissolveDelay({
              seconds: BigInt(additionalDissolveDelaySeconds),
              i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
            }),
          },
        );
        step = StakingWizardCreateNeuronStep.SetAutoStakeMaturity;
        setCurrentStep(step);
      }

      // Step 3: Set auto-stake maturity (if enabled)
      if (step === StakingWizardCreateNeuronStep.SetAutoStakeMaturity) {
        if (params.autoStakeMaturity) {
          await asController(
            governanceCanister,
            (canister) => canister.autoStakeMaturity({ neuronId: id, autoStake: true }),
            { description: t(($) => $.stakeWizardModal.ledgerDevice.approve.autoStake) },
          );
        }
        step = StakingWizardCreateNeuronStep.StartDissolving;
        setCurrentStep(step);
      }

      // Step 4: Start dissolving (if enabled)
      if (step === StakingWizardCreateNeuronStep.StartDissolving) {
        if (params.startDissolving) {
          await asController(governanceCanister, (canister) => canister.startDissolving(id), {
            description: t(($) => $.stakeWizardModal.ledgerDevice.approve.startDissolving),
          });
        }
        step = StakingWizardCreateNeuronStep.SetFollowing;
        setCurrentStep(step);
      }

      // Step 5: Set following automatically. The session signs it as controller or hotkey:
      // the device cannot sign `set_following`.
      if (step === StakingWizardCreateNeuronStep.SetFollowing) {
        const userNeurons = await governanceCanister.listNeurons({
          includeEmptyNeurons: true,
          includePublicNeurons: true,
          certified: true,
        });

        const otherNeurons = userNeurons.filter((n) => n.neuronId !== id);

        if (otherNeurons.length > 0) {
          const consistentFollowees = getConsistentTopicFollowees(otherNeurons);
          if (consistentFollowees) {
            const topicFollowing = buildAdvancedTopicFollowing(consistentFollowees);
            await governanceCanister.setFollowing({ neuronId: id, topicFollowing });
          }
        }

        step = StakingWizardCreateNeuronStep.Done;
        setCurrentStep(step);
      }

      const balanceQueryKey = [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE, params.selectedAccountId];

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: balanceQueryKey }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] }),
      ]).catch(failedRefresh);
    },
    onSuccess: () => {
      if (signer.kind !== 'ledger') return;
      analytics.event(AnalyticsEvent.LedgerDeviceStake, {
        amount_range: getAmountRange(Number(params.amount)),
      });
    },
    onError: (error) => {
      if (signer.kind !== 'ledger') return;
      analytics.event(AnalyticsEvent.LedgerDeviceStakeError, { reason: getErrorReason(error) });
    },
  });

  const reset = () => {
    mutation.reset();
    setCurrentStep(StakingWizardCreateNeuronStep.CreateNeuron);
    setCreatedNeuronId(null);
    setStoredCreatedAt(null);
    setStoredMemo(null);
    setIsTransferDone(false);
  };

  return {
    ...mutation,
    currentStep,
    isTransferDone,
    reset,
  };
}
