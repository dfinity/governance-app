import { nonNullish } from '@dfinity/utils';
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
import { bigIntDiv } from '@utils/bigInt';
import { warningNotification } from '@utils/notification';

enum WizardStep {
  Amount = 'amount',
  DissolveDelay = 'dissolveDelay',
  Configuration = 'configuration',
  Confirmation = 'confirmation',
}

enum DissolveDelayPreset {
  SixMonths = 6,
  OneYear = 12,
  TwoYears = 24,
  FourYears = 48,
  EightYears = 96,
}

enum MaturityMode {
  Auto = 'auto',
  Liquid = 'liquid',
}

enum InitialState {
  Locked = 'locked',
  Dissolving = 'dissolving',
}

interface WizardFormState {
  amount: string;
  dissolveDelayMonths: DissolveDelayPreset;
  maturityMode: MaturityMode;
  initialState: InitialState;
}

const DEFAULT_FORM_STATE: WizardFormState = {
  amount: '',
  dissolveDelayMonths: DissolveDelayPreset.EightYears,
  maturityMode: MaturityMode.Liquid,
  initialState: InitialState.Locked,
};

interface StakeWizardModalProps {
  trigger?: React.ReactNode;
}

export const StakeWizardModal = ({ trigger }: StakeWizardModalProps) => {
  const { t } = useTranslation();
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = nonNullish(balanceValue?.response) ? bigIntDiv(balanceValue.response, E8Sn) : 0;

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(WizardStep.Amount);
  const [formState, setFormState] = useState<WizardFormState>(DEFAULT_FORM_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  void setIsProcessing; // Will be used for API orchestration
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (isProcessing && !open) return;

    setIsOpen(open);
    if (!open) {
      setStep(WizardStep.Amount);
      setFormState(DEFAULT_FORM_STATE);
      setProcessingError(null);
    }
  };

  const goBack = () => {
    switch (step) {
      case WizardStep.DissolveDelay:
        setStep(WizardStep.Amount);
        break;
      case WizardStep.Configuration:
        setStep(WizardStep.DissolveDelay);
        break;
    }
  };

  const goNext = () => {
    switch (step) {
      case WizardStep.Amount:
        setStep(WizardStep.DissolveDelay);
        break;
      case WizardStep.DissolveDelay:
        setStep(WizardStep.Configuration);
        break;
      case WizardStep.Configuration:
        setStep(WizardStep.Confirmation);
        // TODO: Execute staking API calls
        break;
    }
  };

  const updateAmount = (amount: string) => {
    setFormState((prev) => ({ ...prev, amount }));
  };

  const updateDissolveDelay = (dissolveDelayMonths: DissolveDelayPreset) => {
    setFormState((prev) => ({ ...prev, dissolveDelayMonths }));
  };

  const updateMaturityMode = (maturityMode: MaturityMode) => {
    setFormState((prev) => ({ ...prev, maturityMode }));
  };

  const updateInitialState = (initialState: InitialState) => {
    setFormState((prev) => ({ ...prev, initialState }));
  };

  const getStepTitle = (): string => {
    switch (step) {
      case WizardStep.Amount:
        return t(($) => $.stakeWizardModal.steps.amount.title);
      case WizardStep.DissolveDelay:
        return t(($) => $.stakeWizardModal.steps.dissolveDelay.title);
      case WizardStep.Configuration:
        return t(($) => $.stakeWizardModal.steps.configuration.title);
      case WizardStep.Confirmation:
        return t(($) => $.stakeWizardModal.steps.confirmation.title);
    }
  };

  const showBackButton = step === WizardStep.DissolveDelay || step === WizardStep.Configuration;

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

  const defaultTrigger = (
    <Button size="xl" onClick={handleTriggerClick} className="w-full">
      <Plus />
      {t(($) => $.stakeWizardModal.title)}
    </Button>
  );

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild onClick={handleTriggerClick}>
        {trigger ?? defaultTrigger}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col sm:max-w-md">
        <ResponsiveDialogHeader className="relative shrink-0">
          {showBackButton && (
            <button
              onClick={goBack}
              className="absolute top-1/2 left-0 -translate-y-1/2 rounded-md p-1 hover:bg-muted"
              aria-label={t(($) => $.common.back)}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <ResponsiveDialogTitle className={showBackButton ? 'pl-8' : ''}>
            {getStepTitle()}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === WizardStep.Amount && (
            <StepAmount
              amount={formState.amount}
              maxStake={maxStake}
              onAmountChange={updateAmount}
              onNext={goNext}
            />
          )}

          {step === WizardStep.DissolveDelay && (
            <StepDissolveDelay
              dissolveDelayMonths={formState.dissolveDelayMonths}
              maturityMode={formState.maturityMode}
              initialState={formState.initialState}
              onDissolveDelayChange={updateDissolveDelay}
              onNext={goNext}
            />
          )}

          {step === WizardStep.Configuration && (
            <StepConfiguration
              dissolveDelayMonths={formState.dissolveDelayMonths}
              maturityMode={formState.maturityMode}
              initialState={formState.initialState}
              onMaturityModeChange={updateMaturityMode}
              onInitialStateChange={updateInitialState}
              onConfirm={goNext}
            />
          )}

          {step === WizardStep.Confirmation && (
            <StepConfirmation
              formState={formState}
              isProcessing={isProcessing}
              error={processingError}
              onDone={() => handleOpenChange(false)}
              onRetry={() => {
                setProcessingError(null);
                // TODO: Retry staking
              }}
            />
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

// =============================================================================
// Step Components (Placeholders)
// =============================================================================

interface StepAmountProps {
  amount: string;
  maxStake: number;
  onAmountChange: (amount: string) => void;
  onNext: () => void;
}

function StepAmount({ amount, maxStake, onNext }: StepAmountProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground">{t(($) => $.stakeWizardModal.steps.amount.label)}</p>
      <p>{t(($) => $.stakeWizardModal.steps.amount.available, { amount: amount || '0' })}</p>
      <p>Max: {maxStake}</p>
      <Button onClick={onNext}>{t(($) => $.stakeWizardModal.steps.amount.next)}</Button>
    </div>
  );
}

interface StepDissolveDelayProps {
  dissolveDelayMonths: DissolveDelayPreset;
  maturityMode: MaturityMode;
  initialState: InitialState;
  onDissolveDelayChange: (months: DissolveDelayPreset) => void;
  onNext: () => void;
}

function StepDissolveDelay({ dissolveDelayMonths, onNext }: StepDissolveDelayProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground">
        {t(($) => $.stakeWizardModal.steps.dissolveDelay.description)}
      </p>
      <p>
        {t(($) => $.stakeWizardModal.steps.dissolveDelay.presets['8years'])} ({dissolveDelayMonths}{' '}
        months)
      </p>
      <Button onClick={onNext}>{t(($) => $.stakeWizardModal.steps.dissolveDelay.continue)}</Button>
    </div>
  );
}

interface StepConfigurationProps {
  dissolveDelayMonths: DissolveDelayPreset;
  maturityMode: MaturityMode;
  initialState: InitialState;
  onMaturityModeChange: (mode: MaturityMode) => void;
  onInitialStateChange: (state: InitialState) => void;
  onConfirm: () => void;
}

function StepConfiguration({ maturityMode, initialState, onConfirm }: StepConfigurationProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground">
        {t(($) => $.stakeWizardModal.steps.configuration.maturity.label)}
      </p>
      <p>
        {maturityMode === MaturityMode.Auto
          ? t(($) => $.stakeWizardModal.steps.configuration.maturity.autoStake)
          : t(($) => $.stakeWizardModal.steps.configuration.maturity.keepLiquid)}
      </p>
      <p>
        {initialState === InitialState.Locked
          ? t(($) => $.stakeWizardModal.steps.configuration.state.locked)
          : t(($) => $.stakeWizardModal.steps.configuration.state.unlocking)}
      </p>
      <Button onClick={onConfirm}>
        {t(($) => $.stakeWizardModal.steps.configuration.confirm)}
      </Button>
    </div>
  );
}

interface StepConfirmationProps {
  formState: WizardFormState;
  isProcessing: boolean;
  error: string | null;
  onDone: () => void;
  onRetry: () => void;
}

function StepConfirmation({ formState, isProcessing, error, onDone }: StepConfirmationProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground">
        {isProcessing
          ? t(($) => $.stakeWizardModal.steps.confirmation.processing.title)
          : t(($) => $.stakeWizardModal.steps.confirmation.success.title)}
      </p>
      <p>
        {t(($) => $.stakeWizardModal.steps.confirmation.success.amountStaked)}: {formState.amount}
      </p>
      <p>
        {t(($) => $.stakeWizardModal.steps.confirmation.success.dissolveDelay)}:{' '}
        {formState.dissolveDelayMonths} months
      </p>
      {error && <p className="text-destructive">{error}</p>}
      <Button onClick={onDone}>
        {t(($) => $.stakeWizardModal.steps.confirmation.success.done)}
      </Button>
    </div>
  );
}
