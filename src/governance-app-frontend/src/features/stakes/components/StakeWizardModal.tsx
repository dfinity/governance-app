import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, ArrowLeft, Award, Info, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { SegmentedToggle } from '@components/SegmentedToggle';
import { E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { warningNotification } from '@utils/notification';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

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
  dissolveDelayMonths: DissolveDelayPreset.OneYear,
  maturityMode: MaturityMode.Liquid,
  initialState: InitialState.Locked,
};

interface StakeWizardModalProps {
  trigger?: React.ReactNode;
}

export const StakeWizardModal = ({ trigger }: StakeWizardModalProps) => {
  const { t } = useTranslation();
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = nonNullish(balanceValue?.response)
    ? bigIntDiv(balanceValue.response, E8Sn, 8)
    : 0;
  const stakingRewards = useStakingRewards();
  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? (stakingRewards.stakingFlowApyPreview[96].autoStake.locked * 100).toFixed(1)
    : '12';

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

  const balanceICP = bigIntDiv(balanceValue?.response || 0n, E8Sn);
  const canStake = balanceICP > ICP_TRANSACTION_FEE;

  const handleTriggerClick = () => {
    if (!canStake) {
      warningNotification({
        description: t(($) =>
          balanceICP === 0
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
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col focus:outline-none">
        <ResponsiveDialogHeader className="mb-4 shrink-0">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button
                onClick={goBack}
                className="rounded-md p-1 hover:bg-muted"
                aria-label={t(($) => $.common.back)}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <ResponsiveDialogTitle>{getStepTitle()}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
          {step === WizardStep.Amount && (
            <StepAmount
              amount={formState.amount}
              maxStake={maxStake}
              maxApy={maxApy}
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
// Max Rewards Badge
// =============================================================================

function MaxRewardsBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
      <Award className="h-3 w-3" />
      {label}
    </span>
  );
}

// =============================================================================
// Step 1: Amount
// =============================================================================

interface StepAmountProps {
  amount: string;
  maxStake: number;
  maxApy: string;
  onAmountChange: (amount: string) => void;
  onNext: () => void;
}

function StepAmount({ amount, maxStake, maxApy, onAmountChange, onNext }: StepAmountProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAmountChange = (value: string) => {
    onAmountChange(value);
    setError(null);
  };

  const handleMax = () => {
    onAmountChange(maxStake.toString());
    // Give focus back to input after clicking the Max button
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setError(null);
  };

  const handleNext = () => {
    const numericAmount = Number(amount);

    if (amount === '' || numericAmount <= ICP_TRANSACTION_FEE) {
      setError(t(($) => $.stakeWizardModal.errors.amountTooLow, { fee: ICP_TRANSACTION_FEE }));
      return;
    }

    if (numericAmount > maxStake) {
      setError(t(($) => $.stakeWizardModal.errors.insufficientBalance));
      return;
    }

    onNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <Label htmlFor="stake-amount">{t(($) => $.stakeWizardModal.steps.amount.label)}</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            id="stake-amount"
            type="number"
            placeholder="0.00"
            min="0"
            max={maxStake}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`h-14 [appearance:textfield] border-2 pr-24 focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
            <Button type="button" size="sm" onClick={handleMax} className="h-7 px-2 text-xs">
              {t(($) => $.stakeWizardModal.steps.amount.maxButton)}
            </Button>
            <span className="text-sm font-semibold text-muted-foreground">
              {t(($) => $.common.icp)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.stakeWizardModal.steps.amount.available, { amount: maxStake.toString() })}
        </p>
        {error && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          {t(($) => $.stakeWizardModal.infoBoxes.whatIsStaking, { maxApy })}
        </AlertDescription>
      </Alert>

      <Button onClick={handleNext} size="xl" className="w-full">
        {t(($) => $.common.next)}
      </Button>
    </div>
  );
}

// =============================================================================
// Step 2: Dissolve Delay
// =============================================================================

const DISSOLVE_DELAY_OPTIONS: {
  value: DissolveDelayPreset;
  labelKey: '6months' | '1year' | '2years' | '4years' | '8years';
}[] = [
  { value: DissolveDelayPreset.SixMonths, labelKey: '6months' },
  { value: DissolveDelayPreset.OneYear, labelKey: '1year' },
  { value: DissolveDelayPreset.TwoYears, labelKey: '2years' },
  { value: DissolveDelayPreset.FourYears, labelKey: '4years' },
  { value: DissolveDelayPreset.EightYears, labelKey: '8years' },
];

interface StepDissolveDelayProps {
  dissolveDelayMonths: DissolveDelayPreset;
  maturityMode: MaturityMode;
  initialState: InitialState;
  onDissolveDelayChange: (months: DissolveDelayPreset) => void;
  onNext: () => void;
}

function StepDissolveDelay({
  dissolveDelayMonths,
  onDissolveDelayChange,
  onNext,
}: StepDissolveDelayProps) {
  const { t } = useTranslation();

  // Separate regular options from the max rewards option
  const regularOptions = DISSOLVE_DELAY_OPTIONS.filter(
    (opt) => opt.value !== DissolveDelayPreset.EightYears,
  );
  const maxRewardsOption = DISSOLVE_DELAY_OPTIONS.find(
    (opt) => opt.value === DissolveDelayPreset.EightYears,
  )!;
  const isMaxRewardsSelected = dissolveDelayMonths === DissolveDelayPreset.EightYears;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t(($) => $.stakeWizardModal.steps.dissolveDelay.description)}
      </p>

      <div>
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {regularOptions.map((option) => {
            const isSelected = dissolveDelayMonths === option.value;

            return (
              <button
                key={option.value}
                onClick={() => onDissolveDelayChange(option.value)}
                className={`rounded-lg border-2 px-4 py-4 text-center font-medium transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                {t(($) => $.stakeWizardModal.steps.dissolveDelay.presets[option.labelKey])}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onDissolveDelayChange(maxRewardsOption.value)}
          className={`w-full rounded-lg border-2 px-4 py-4 text-center transition-colors ${
            isMaxRewardsSelected
              ? 'border-green-600 bg-gradient-to-br from-green-600/12 to-green-600/4'
              : 'border-green-600/30 bg-gradient-to-br from-green-600/8 to-green-600/4 hover:bg-gradient-to-br hover:from-green-600/14 hover:to-green-600/8'
          }`}
        >
          <span className="font-medium">
            {t(($) => $.stakeWizardModal.steps.dissolveDelay.presets[maxRewardsOption.labelKey])}
          </span>
          <span className="ml-2 inline-flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
            <Award className="h-3 w-3" />
            {t(($) => $.stakeWizardModal.badges.maxRewards)}
          </span>
        </button>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t(($) => $.stakeWizardModal.infoBoxes.dissolveDelayWarning)}
        </AlertDescription>
      </Alert>

      <Button onClick={onNext} size="xl" className="w-full">
        {t(($) => $.common.next)}
      </Button>
    </div>
  );
}

// =============================================================================
// Step 3: Configuration
// =============================================================================

interface StepConfigurationProps {
  dissolveDelayMonths: DissolveDelayPreset;
  maturityMode: MaturityMode;
  initialState: InitialState;
  onMaturityModeChange: (mode: MaturityMode) => void;
  onInitialStateChange: (state: InitialState) => void;
  onConfirm: () => void;
}

function StepConfiguration({
  maturityMode,
  initialState,
  onMaturityModeChange,
  onInitialStateChange,
  onConfirm,
}: StepConfigurationProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      {/* Maturity Mode Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">
            {t(($) => $.stakeWizardModal.steps.configuration.maturity.label)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.configuration.maturity.description)}
          </p>
        </div>

        <SegmentedToggle
          value={maturityMode === MaturityMode.Auto ? 'left' : 'right'}
          onValueChange={(v) =>
            onMaturityModeChange(v === 'left' ? MaturityMode.Auto : MaturityMode.Liquid)
          }
          leftLabel={t(($) => $.stakeWizardModal.steps.configuration.maturity.autoStake)}
          rightLabel={t(($) => $.stakeWizardModal.steps.configuration.maturity.keepLiquid)}
          highlightedValue="left"
          leftSubLabel={<MaxRewardsBadge label={t(($) => $.stakeWizardModal.badges.maxRewards)} />}
        />
      </div>

      {/* Initial State Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">
            {t(($) => $.stakeWizardModal.steps.configuration.state.label)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.configuration.state.description)}
          </p>
        </div>

        <SegmentedToggle
          value={initialState === InitialState.Locked ? 'left' : 'right'}
          onValueChange={(v) =>
            onInitialStateChange(v === 'left' ? InitialState.Locked : InitialState.Dissolving)
          }
          leftLabel={t(($) => $.stakeWizardModal.steps.configuration.state.locked)}
          rightLabel={t(($) => $.stakeWizardModal.steps.configuration.state.unlocking)}
          highlightedValue="left"
          leftSubLabel={<MaxRewardsBadge label={t(($) => $.stakeWizardModal.badges.maxRewards)} />}
        />
      </div>

      {/* Info Box */}
      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <div>
            <Trans
              i18nKey={($) => $.stakeWizardModal.infoBoxes.lockedDescription}
              t={t}
              components={{ strong: <strong /> }}
            />
            <br />
            <Trans
              i18nKey={($) => $.stakeWizardModal.infoBoxes.unlockingDescription}
              t={t}
              components={{ strong: <strong /> }}
            />
          </div>
        </AlertDescription>
      </Alert>

      <Button onClick={onConfirm} size="xl" className="w-full">
        {t(($) => $.stakeWizardModal.steps.configuration.confirm)}
      </Button>
    </div>
  );
}

// =============================================================================
// Step 4: Confirmation (Placeholder)
// =============================================================================

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
    <div className="flex flex-col gap-4">
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
      <Button onClick={onDone} className="w-full">
        {t(($) => $.stakeWizardModal.steps.confirmation.success.done)}
      </Button>
    </div>
  );
}
