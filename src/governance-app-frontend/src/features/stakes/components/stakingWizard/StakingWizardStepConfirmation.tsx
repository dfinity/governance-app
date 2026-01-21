import { AlertTriangle, Loader } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

import { STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS } from './constants';
import { StakingWizardCreateNeuronStep, StakingWizardFormState } from './types';

interface Props {
  formState: StakingWizardFormState;
  isProcessing: boolean;
  currentStep: StakingWizardCreateNeuronStep;
  error: string | null;
  expectedApy: string;
  onDone: () => void;
  onRetry: () => void;
}

export function StakingWizardStepConfirmation({
  formState,
  isProcessing,
  currentStep,
  error,
  expectedApy,
  onDone,
  onRetry,
}: Props) {
  const { t } = useTranslation();

  const getStepLabel = (step: StakingWizardCreateNeuronStep): string => {
    switch (step) {
      case StakingWizardCreateNeuronStep.CreateNeuron:
        return t(($) => $.stakeWizardModal.steps.confirmation.processing.steps.createNeuron);
      case StakingWizardCreateNeuronStep.SetDissolveDelay:
        return t(($) => $.stakeWizardModal.steps.confirmation.processing.steps.setDissolveDelay);
      case StakingWizardCreateNeuronStep.SetAutoStakeMaturity:
        return t(($) => $.stakeWizardModal.steps.confirmation.processing.steps.setAutoStake);
      case StakingWizardCreateNeuronStep.StartDissolving:
        return t(($) => $.stakeWizardModal.steps.confirmation.processing.steps.startDissolving);
      case StakingWizardCreateNeuronStep.Done:
        return t(($) => $.stakeWizardModal.steps.confirmation.processing.steps.refreshingData);
      default:
        return '';
    }
  };

  if (isProcessing) {
    return (
      <div
        className="flex flex-col items-center gap-6 text-center"
        data-testid="staking-wizard-processing"
      >
        <AnimatedLoader />
        <div>
          <p className="mb-3 text-lg font-semibold">
            {t(($) => $.stakeWizardModal.steps.confirmation.processing.title)}
          </p>
          <span className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            {getStepLabel(currentStep)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.stakeWizardModal.steps.confirmation.processing.warning)}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center gap-6 text-center"
        data-testid="staking-wizard-error"
      >
        <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
          <AnimatedErrorIcon />
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold">
            {t(($) => $.stakeWizardModal.steps.confirmation.error.title)}
          </h3>
          <span className="rounded-md bg-orange-100/50 px-3 py-1.5 text-sm text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            {t(($) => $.stakeWizardModal.steps.confirmation.error.failedAt, {
              step: getStepLabel(currentStep),
            })}
          </span>
        </div>
        <Button
          onClick={onRetry}
          size="xl"
          className="w-full uppercase"
          data-testid="staking-wizard-retry-btn"
        >
          {t(($) => $.stakeWizardModal.steps.confirmation.error.retry)}
        </Button>
      </div>
    );
  }

  // Success state
  const dissolveDelayOption = STAKING_WIZARD_DISSOLVE_DELAY_OPTIONS.find(
    (opt) => opt.value === formState.dissolveDelayMonths,
  );
  const dissolveDelayLabel = dissolveDelayOption
    ? t(($) => $.stakeWizardModal.steps.dissolveDelay.presets[dissolveDelayOption.labelKey])
    : '';

  return (
    <div
      className="flex flex-col items-center gap-6 text-center"
      data-testid="staking-wizard-success"
    >
      <motion.div
        className="flex size-20 items-center justify-center rounded-full bg-green-600/10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatedCheckmark />
      </motion.div>
      <h3 className="text-xl font-semibold">
        {t(($) => $.stakeWizardModal.steps.confirmation.success.title)}
      </h3>

      <div className="w-full space-y-3 rounded-lg bg-muted p-4">
        <div className="flex justify-between border-b border-border/90 pb-2 dark:border-gray-200/10">
          <span className="text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.confirmation.success.amountStaked)}
          </span>
          <span className="font-semibold">
            {formState.amount} {t(($) => $.common.icp)}
          </span>
        </div>
        <div className="flex justify-between border-b border-border/90 pb-2 dark:border-gray-200/10">
          <span className="text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.confirmation.success.dissolveDelay)}
          </span>
          <span className="font-semibold">{dissolveDelayLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t(($) => $.stakeWizardModal.steps.confirmation.success.expectedApy)}
          </span>
          <span className="font-semibold text-green-600 dark:text-green-400">{expectedApy}</span>
        </div>
      </div>

      <Button
        onClick={onDone}
        size="xl"
        className="w-full uppercase"
        data-testid="staking-wizard-done-btn"
      >
        {t(($) => $.stakeWizardModal.steps.confirmation.success.done)}
      </Button>
    </div>
  );
}

function AnimatedLoader() {
  return (
    <motion.div
      className="flex size-20 items-center justify-center rounded-full bg-green-600/10"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Loader className="size-10 animate-spin text-green-600" />
    </motion.div>
  );
}

function AnimatedCheckmark() {
  return (
    <motion.svg
      className="size-12 text-green-600 dark:text-green-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

function AnimatedErrorIcon() {
  return (
    <motion.div
      initial={{ scale: 0.8, rotate: 0 }}
      animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <AlertTriangle className="size-12 text-destructive" />
    </motion.div>
  );
}
