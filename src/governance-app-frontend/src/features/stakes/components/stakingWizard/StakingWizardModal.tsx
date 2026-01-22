import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@components/AlertDialog';
import { buttonVariants } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';
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
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function StakingWizardModal({ isOpen, setIsOpen }: Props) {
  const { t } = useTranslation();

  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
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

  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when step changes
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [step]);

  // Check if user has unsaved data (step 2 or 3, not processing)
  const checkHasUnsavedData = () =>
    step !== StakingWizardStep.Amount &&
    step !== StakingWizardStep.Confirmation &&
    !createNeuron.isProcessing;

  const closeAndReset = () => {
    setIsOpen(false);
    // Wait for the modal to close before resetting the step and form state
    // to avoid an animation glitch.
    setTimeout(() => {
      setStep(StakingWizardStep.Amount);
      setFormState(STAKING_WIZARD_DEFAULT_FORM_STATE);
      createNeuron.reset();
    }, 500);
  };

  const handleOpenChange = (toOpen: boolean) => {
    if (createNeuron.isProcessing && !toOpen) return;

    // If closing and has unsaved data, show confirmation dialog
    if (!toOpen && checkHasUnsavedData()) {
      setShowCloseConfirmation(true);
      return;
    }

    if (toOpen) {
      setIsOpen(true);
    } else {
      closeAndReset();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
    closeAndReset();
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
        analytics.event(AnalyticsEvent.StakingSetStakeAmount);
        setStep(StakingWizardStep.DissolveDelay);
        break;
      case StakingWizardStep.DissolveDelay:
        analytics.event(AnalyticsEvent.StakingSetDissolveDelay, {});
        setStep(StakingWizardStep.Configuration);
        break;
      case StakingWizardStep.Configuration:
        analytics.event(AnalyticsEvent.StakingSetConfiguration, {});
        setStep(StakingWizardStep.Confirmation);

        createNeuron.execute().then(() => {
          analytics.event(AnalyticsEvent.StakingConfirmation, {
            amount: formState.amount,
            dissolveDelayMonths: formState.dissolveDelayMonths.toString(),
            maturityMode:
              formState.maturityMode === StakingWizardMaturityMode.Auto ? 'auto' : 'liquid',
            initialState:
              formState.initialState === StakingWizardInitialState.Locked ? 'locked' : 'dissolving',
          });
        });
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
    return preview[maturityKey][stateKey];
  };

  const getCurrentApyFormatted = (): string => {
    if (!isStakingRewardDataReady(stakingRewards)) {
      return '~...%';
    }
    return `~${formatPercentage(getCurrentApyValue())}`;
  };

  return (
    <>
      {/* Block navigation during processing */}
      <NavigationBlockerDialog
        isBlocked={createNeuron.isProcessing}
        description={t(($) => $.stakeWizardModal.confirmNavigation)}
      />
      {/* Block navigation when user has unsaved data */}
      <NavigationBlockerDialog
        isBlocked={isOpen && checkHasUnsavedData()}
        description={t(($) => $.stakeWizardModal.confirmNavigationUnsaved)}
      />
      {/* Confirmation dialog when closing modal with unsaved data */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent data-testid="staking-wizard-close-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>{t(($) => $.common.warning)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(($) => $.stakeWizardModal.confirmNavigationUnsaved)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(($) => $.common.cancel)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className={buttonVariants({ variant: 'destructive' })}
              data-testid="staking-wizard-close-confirmation-leave"
            >
              {t(($) => $.common.leave)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        dismissible={!createNeuron.isProcessing}
      >
        <ResponsiveDialogContent
          className="flex max-h-[90vh] flex-col focus:outline-none"
          showCloseButton={!createNeuron.isProcessing}
          data-testid="staking-wizard-dialog"
        >
          <ResponsiveDialogHeader className="shrink-0">
            <div className="relative flex items-center justify-center">
              {showBackButton && (
                <button
                  onClick={goBack}
                  className="absolute left-0 rounded-md p-1 hover:bg-muted"
                  aria-label={t(($) => $.common.back)}
                  data-testid="staking-wizard-back-btn"
                >
                  <ArrowLeft className="size-5" />
                </button>
              )}
              <ResponsiveDialogTitle>{getStepTitle()}</ResponsiveDialogTitle>
            </div>
            {showApyPreview && (
              <div className="mt-0 flex justify-center">
                <StakingWizardAnimatedApyBadge value={getCurrentApyValue() * 100} />
              </div>
            )}
          </ResponsiveDialogHeader>

          <div ref={contentRef} className="mt-4 flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
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
    </>
  );
}
