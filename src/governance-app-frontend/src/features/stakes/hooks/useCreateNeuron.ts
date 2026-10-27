import {
  CouldNotClaimNeuronError,
  type NeuronInfo,
  NeuronState,
  type NnsGovernanceCanister,
} from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
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
import { duplicateTransferOf } from '@utils/errors/duplicateTransfer';
import { formatDissolveDelay } from '@utils/neuron';
import { failedRefresh, QUERY_KEYS } from '@utils/query';
import { getIcpLedgerCanister, getNnsGovernanceCanister } from '@common/canisters';
import { runOnDevice } from '@common/ledger/deviceQueue';
import { getLedgerIdentity } from '@common/ledger/session';
import { II_SIGNER, type Signer } from '@common/ledger/signer';

import { StakingWizardCreateNeuronStep } from '../components/stakingWizard/types';
import { claimDeviceStake } from '../utils/claimDeviceStake';
import { createStakeMemo, getStakeAccountIdentifier } from '../utils/ledgerStake';
import {
  clearPendingDeviceStake,
  readPendingDeviceStake,
  writePendingDeviceStake,
} from '../utils/pendingDeviceStake';

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

// New neurons start with this dissolve delay.
const DEFAULT_DISSOLVE_DELAY_SECONDS = SECONDS_IN_DAY * 7;

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
 * A device call that the user cancelled in the dialog can still succeed on the device. Every
 * step is safe to run again: a duplicate transfer counts as done, and the controller steps
 * read the neuron first and apply only what is missing.
 *
 * @param params Props - configuration for the new neuron
 * @returns
 *   - mutation properties (mutate, mutateAsync, isPending, error, reset, etc.)
 *   - currentStep: StakingWizardCreateNeuronStep - current/failed step for progress display
 *   - isTransferDone: true once the device transfer went through and the claim is still pending
 *   - stakedAmount: the amount in ICP, the one of a recovered device stake when there is one
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
  // Device stake: the amount of an unclaimed transfer from an earlier wizard session.
  const [recoveredAmount, setRecoveredAmount] = useState<string | null>(null);
  const stakedAmount = recoveredAmount ?? params.amount;

  /** Runs a device call behind the approval dialog, in the queue of the device. */
  const onDevice = <T>(
    principal: string,
    call: (signal: AbortSignal) => Promise<T>,
    options: DeviceActionOptions,
  ): Promise<T | undefined> =>
    runDeviceAction(
      (signal) =>
        runOnDevice(principal, async () => {
          // A cancelled call that waited in the queue must not prompt the device.
          if (signal.aborted) return undefined;
          return call(signal);
        }),
      options,
    );

  /**
   * Runs a controller-only call: on the device for a Ledger signer, with the session otherwise.
   * The call checks `signal.aborted` after every await, right before the signature.
   */
  const asController = (
    canister: NnsGovernanceCanister,
    call: (canister: NnsGovernanceCanister, signal: AbortSignal) => Promise<void>,
    options: DeviceActionOptions,
  ): Promise<void | undefined> =>
    signer.kind === 'ledger'
      ? onDevice(
          signer.principal,
          async (signal) => {
            const deviceCanister = await getNnsGovernanceCanister({ signer });
            // A cancel during the device connection must not ask for a signature.
            if (signal.aborted) return;
            await call(deviceCanister, signal);
          },
          options,
        )
      : call(canister, new AbortController().signal);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!governanceCanister || !ledgerCanister || !identity) {
        throw new Error(t(($) => $.stakeWizardModal.errors.stakeFailed));
      }

      let neuronId = createdNeuronId;
      let step = currentStep;

      // Device only: a cancelled device call can still succeed, so each controller step reads
      // the neuron inside the device queue, after the pending call settled, and applies only
      // what is missing. The session reads as hotkey or controller.
      const readNeuron = (id: bigint): Promise<NeuronInfo | undefined> =>
        signer.kind === 'ledger'
          ? governanceCanister.getNeuron({ certified: true, neuronId: id })
          : Promise.resolve(undefined);

      // Step 1: Create neuron
      // This is special step: the stakeNeuron call abstracts both the transfer and the claim_or_refresh_neuron.
      // If the connection drops after the transfer but before the claim, there could be a need for manual intervention.
      // At the moment we have not way to detect this and the user would need to manually claim the neuron.
      // Future ICRC2 support should fix this potential issue.
      if (step === StakingWizardCreateNeuronStep.CreateNeuron) {
        const createdAt = storedCreatedAt ?? nowInBigIntNanoSeconds();
        setStoredCreatedAt(createdAt);

        if (signer.kind === 'ledger') {
          // The device signs the transfer and cannot sign the claim. The two calls are
          // separate, so a failed claim keeps the memo and retries without a second transfer.
          const controller = Principal.fromText(signer.principal);
          const claim = (memo: bigint) => claimDeviceStake({ controller, memo });

          // An earlier wizard session signed a transfer and did not claim it. Claim it first:
          // the ICP already sits in its sub-account. The claim waits in the device queue, so a
          // cancelled transfer that the device still signs lands before the claim reads it.
          const pending =
            storedMemo === null ? readPendingDeviceStake(signer.principal) : undefined;
          if (nonNullish(pending)) {
            const recoveredId = await runOnDevice(signer.principal, () =>
              claim(BigInt(pending.memo)),
            );
            clearPendingDeviceStake(signer.principal);
            if (nonNullish(recoveredId)) {
              neuronId = recoveredId;
              setRecoveredAmount(pending.amount);
            }
          }

          if (isNullish(neuronId)) {
            const memo = storedMemo ?? createStakeMemo();
            setStoredMemo(memo);

            if (!isTransferDone) {
              // Kept until the claim succeeds, so a closed wizard or a reload can still claim.
              // Written before the signature: the device can sign after a cancelled dialog.
              writePendingDeviceStake(signer.principal, {
                memo: memo.toString(),
                amount: params.amount,
              });
              await onDevice(
                signer.principal,
                async (signal) => {
                  const deviceIdentity = await getLedgerIdentity(signer.principal);
                  const deviceLedger = await getIcpLedgerCanister({ signer });
                  // A cancel during the device connection must not ask for a signature.
                  if (signal.aborted) return;
                  // Set right before the call, so a failure before the signature does not
                  // leak the stake screen into the next transfer.
                  deviceIdentity.flagUpcomingStakeNeuron();
                  try {
                    await deviceLedger.transfer({
                      memo,
                      amount: bigIntMul(E8Sn, Number(params.amount)),
                      to: getStakeAccountIdentifier({ controller, memo }),
                      createdAt,
                      fee: ICP_TRANSACTION_FEE_E8Sn,
                    });
                  } catch (error: unknown) {
                    // The device signed an earlier attempt after its dialog was cancelled.
                    if (duplicateTransferOf(error) === undefined) throw error;
                  }
                },
                {
                  description: t(($) => $.stakeWizardModal.ledgerDevice.approve.transfer),
                  detail: t(($) => $.common.inIcp, { value: params.amount }),
                },
              );
              setIsTransferDone(true);
            }

            neuronId = (await claim(memo)) ?? null;
            if (isNullish(neuronId)) throw new CouldNotClaimNeuronError();
            clearPendingDeviceStake(signer.principal);
            setIsTransferDone(false);
          }
          step = StakingWizardCreateNeuronStep.AddHotkey;
        } else {
          neuronId = await governanceCanister.stakeNeuron({
            stake: bigIntMul(E8Sn, Number(params.amount)),
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
          async (canister, signal) => {
            const hotKeys = (await readNeuron(id))?.fullNeuron?.hotKeys ?? [];
            if (hotKeys.includes(hotkey.toText()) || signal.aborted) return;
            await canister.addHotkey({ neuronId: id, principal: hotkey });
          },
          {
            description: t(($) => $.stakeWizardModal.ledgerDevice.approve.hotkey),
            detail: hotkey.toText(),
          },
        );
        step = StakingWizardCreateNeuronStep.SetDissolveDelay;
        setCurrentStep(step);
      }

      // Step 2: Set dissolve delay
      // The increase is additive, so read the current delay first: a new neuron starts with
      // 7 days, and a retry after a cancelled device call may find the target already set.
      if (step === StakingWizardCreateNeuronStep.SetDissolveDelay) {
        await asController(
          governanceCanister,
          async (canister, signal) => {
            const currentDelay = Number(
              (await readNeuron(id))?.dissolveDelaySeconds ?? DEFAULT_DISSOLVE_DELAY_SECONDS,
            );
            const additionalDissolveDelaySeconds = params.dissolveDelaySeconds - currentDelay;
            if (additionalDissolveDelaySeconds <= 0 || signal.aborted) return;
            await canister.increaseDissolveDelay({ neuronId: id, additionalDissolveDelaySeconds });
          },
          {
            description: t(($) => $.stakeWizardModal.ledgerDevice.approve.dissolveDelay),
            detail: formatDissolveDelay({
              seconds: BigInt(params.dissolveDelaySeconds),
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
            async (canister, signal) => {
              if ((await readNeuron(id))?.fullNeuron?.autoStakeMaturity || signal.aborted) return;
              await canister.autoStakeMaturity({ neuronId: id, autoStake: true });
            },
            { description: t(($) => $.stakeWizardModal.ledgerDevice.approve.autoStake) },
          );
        }
        step = StakingWizardCreateNeuronStep.StartDissolving;
        setCurrentStep(step);
      }

      // Step 4: Start dissolving (if enabled). A neuron that already dissolves rejects the call.
      if (step === StakingWizardCreateNeuronStep.StartDissolving) {
        if (params.startDissolving) {
          await asController(
            governanceCanister,
            async (canister, signal) => {
              if ((await readNeuron(id))?.state === NeuronState.Dissolving || signal.aborted)
                return;
              await canister.startDissolving(id);
            },
            { description: t(($) => $.stakeWizardModal.ledgerDevice.approve.startDissolving) },
          );
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
        amount_range: getAmountRange(Number(stakedAmount)),
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
    setRecoveredAmount(null);
  };

  return {
    ...mutation,
    currentStep,
    isTransferDone,
    stakedAmount,
    reset,
  };
}
