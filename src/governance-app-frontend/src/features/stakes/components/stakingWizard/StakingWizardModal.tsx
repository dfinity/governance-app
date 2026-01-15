import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { warningNotification } from '@utils/notification';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { useCreateNeuron } from '../../hooks/useCreateNeuron';
import { STAKING_WIZARD_DEFAULT_FORM_STATE } from './constants';
import { StakingWizardAnimatedApyBadge } from './StakingWizardAnimatedApyBadge';
import { StakingWizardStepAmount } from './StakingWizardStepAmount';
import { StakingWizardStepConfiguration } from './StakingWizardStepConfiguration';
import { StakingWizardStepConfirmation } from './StakingWizardStepConfirmation';
import { StakingWizardStepDissolveDelay } from './StakingWizardStepDissolveDelay';
import {
  StakingWizardDissolveDelayPreset,
  StakingWizardFormState,
  StakingWizardInitialState,
  StakingWizardMaturityMode,
  StakingWizardStep,
} from './types';

interface Props {
  triggerText?: string;
}

export function StakingWizardModal({ triggerText }: Props) {
  const { t } = useTranslation();

  const { data: balanceValue } = useIcpLedgerAccountBalance();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<StakingWizardStep>(StakingWizardStep.Amount);
  const [formState, setFormState] = useState<StakingWizardFormState>(
    STAKING_WIZARD_DEFAULT_FORM_STATE,
  );

  const createNeuron = useCreateNeuron({
    amount: formState.amount,
    dissolveDelayMonths: formState.dissolveDelayMonths,
    autoStakeMaturity: formState.maturityMode === StakingWizardMaturityMode.Auto,
    startDissolving: formState.initialState === StakingWizardInitialState.Dissolving,
  });

  const handleOpenChange = (toOpen: boolean) => {
    if (createNeuron.isProcessing && !toOpen) return;
    setIsOpen(toOpen);

    if (!toOpen) {
      // Delay reset until close animation completes to avoid visual glitch
      setTimeout(() => {
        setStep(StakingWizardStep.Amount);
        setFormState(STAKING_WIZARD_DEFAULT_FORM_STATE);
        createNeuron.reset();
      }, 200);
    }
  };

  const goBack = () => {
    switch (step) {
      case StakingWizardStep.DissolveDelay:
        setStep(StakingWizardStep.Amount);
        break;
      case StakingWizardStep.Configuration:
        setStep(StakingWizardStep.DissolveDelay);
        break;
    }
  };

  const goNext = () => {
    switch (step) {
      case StakingWizardStep.Amount:
        setStep(StakingWizardStep.DissolveDelay);
        break;
      case StakingWizardStep.DissolveDelay:
        setStep(StakingWizardStep.Configuration);
        break;
      case StakingWizardStep.Configuration:
        setStep(StakingWizardStep.Confirmation);
        createNeuron.execute();
        break;
    }
  };

  const updateAmount = (amount: string) => {
    setFormState((prev) => ({ ...prev, amount }));
  };

  const updateDissolveDelay = (dissolveDelayMonths: StakingWizardDissolveDelayPreset) => {
    setFormState((prev) => ({ ...prev, dissolveDelayMonths }));
  };

  const updateMaturityMode = (maturityMode: StakingWizardMaturityMode) => {
    setFormState((prev) => ({ ...prev, maturityMode }));
  };

  const updateInitialState = (initialState: StakingWizardInitialState) => {
    setFormState((prev) => ({ ...prev, initialState }));
  };

  const getStepTitle = (): string => {
    switch (step) {
      case StakingWizardStep.Amount:
        return t(($) => $.stakeWizardModal.steps.amount.title);
      case StakingWizardStep.DissolveDelay:
        return t(($) => $.stakeWizardModal.steps.dissolveDelay.title);
      case StakingWizardStep.Configuration:
        return t(($) => $.stakeWizardModal.steps.configuration.title);
      case StakingWizardStep.Confirmation:
        if (!createNeuron.isProcessing && !createNeuron.error) {
          return t(($) => $.stakeWizardModal.steps.confirmation.successTitle);
        }
        return t(($) => $.stakeWizardModal.steps.confirmation.title);
    }
  };

  const showBackButton =
    step === StakingWizardStep.DissolveDelay || step === StakingWizardStep.Configuration;
  const showApyPreview =
    step === StakingWizardStep.DissolveDelay || step === StakingWizardStep.Configuration;

  const stakingRewards = useStakingRewards();

  const getCurrentApyValue = (): number => {
    if (!isStakingRewardDataReady(stakingRewards)) {
      return 0;
    }
    const preview = stakingRewards.stakingFlowApyPreview[formState.dissolveDelayMonths];
    const maturityKey =
      formState.maturityMode === StakingWizardMaturityMode.Auto ? 'autoStake' : 'nonAutoStake';
    const stateKey =
      formState.initialState === StakingWizardInitialState.Locked ? 'locked' : 'dissolving';
    return preview[maturityKey][stateKey] * 100;
  };

  const getCurrentApyFormatted = (): string => {
    if (!isStakingRewardDataReady(stakingRewards)) {
      return '~...%';
    }
    return `~${getCurrentApyValue().toFixed(2)}%`;
  };

  const balanceICPs = bigIntDiv(balanceValue?.response || 0n, E8Sn);
  const canStake = balanceICPs > ICP_TRANSACTION_FEE;

  const handleTriggerClick = () => {
    if (!canStake) {
      warningNotification({
        description: t(($) =>
          balanceICPs === 0
            ? $.neuron.stakeNeuron.errors.zeroBalance
            : $.neuron.stakeNeuron.errors.insufficientBalance,
        ),
      });
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button size="xl" onClick={handleTriggerClick} className="w-full">
          <Plus />
          {triggerText ?? t(($) => $.stakeWizardModal.title)}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col focus:outline-none"
        showCloseButton={!createNeuron.isProcessing}
      >
        <ResponsiveDialogHeader className="shrink-0">
          <div className="relative flex items-center justify-center">
            {showBackButton && (
              <button
                onClick={goBack}
                className="absolute left-0 rounded-md p-1 hover:bg-muted"
                aria-label={t(($) => $.common.back)}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <ResponsiveDialogTitle>{getStepTitle()}</ResponsiveDialogTitle>
          </div>
          {showApyPreview && (
            <div className="mt-0 flex justify-center">
              <StakingWizardAnimatedApyBadge value={getCurrentApyValue()} />
            </div>
          )}
        </ResponsiveDialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
          {step === StakingWizardStep.Amount && (
            <StakingWizardStepAmount
              amount={formState.amount}
              onAmountChange={updateAmount}
              onNext={goNext}
            />
          )}

          {step === StakingWizardStep.DissolveDelay && (
            <StakingWizardStepDissolveDelay
              dissolveDelayMonths={formState.dissolveDelayMonths}
              onDissolveDelayChange={updateDissolveDelay}
              onNext={goNext}
            />
          )}

          {step === StakingWizardStep.Configuration && (
            <StakingWizardStepConfiguration
              maturityMode={formState.maturityMode}
              initialState={formState.initialState}
              onMaturityModeChange={updateMaturityMode}
              onInitialStateChange={updateInitialState}
              onConfirm={goNext}
            />
          )}

          {step === StakingWizardStep.Confirmation && (
            <StakingWizardStepConfirmation
              formState={formState}
              isProcessing={createNeuron.isProcessing}
              currentStep={createNeuron.currentStep}
              error={createNeuron.error}
              expectedApy={getCurrentApyFormatted()}
              onDone={() => handleOpenChange(false)}
              onRetry={createNeuron.execute}
            />
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
