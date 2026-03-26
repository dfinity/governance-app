import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  AnimatedErrorIcon,
  AnimatedSpinner,
  AnimatedSuccessIcon,
  FadeInText,
  PhaseContainer,
} from '@components/MutationPhases';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { SUCCESS_AUTO_CLOSE_MS } from '@constants/extra';
import { mapCanisterError } from '@utils/errors';

import { SubAccountDialogMode } from '../types';

enum Phase {
  Form = 'form',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 24;

type SubAccountNameDialogConfig = {
  mode: SubAccountDialogMode;
  inputId: string;
  initialName: string;
  isSubmitDisabled?: (trimmedName: string) => boolean;
  onSubmit: (trimmedName: string) => Promise<unknown>;
  trigger: (open: () => void) => ReactNode;
  blockingContent?: (name: string) => ReactNode;
};

function useDialogTranslations(mode: SubAccountDialogMode) {
  const { t } = useTranslation();

  if (mode === SubAccountDialogMode.Create) {
    return {
      title: t(($) => $.accounts.createSubAccount.title),
      description: t(($) => $.accounts.createSubAccount.description),
      nameLabel: t(($) => $.accounts.createSubAccount.nameLabel),
      placeholder: undefined,
      confirmLabel: t(($) => $.accounts.createSubAccount.confirm),
      processingMessage: (name: string) => t(($) => $.accounts.createSubAccount.creating, { name }),
      successMessage: (name: string) => t(($) => $.accounts.createSubAccount.success, { name }),
      errorFallback: t(($) => $.accounts.createSubAccount.error),
    };
  }

  return {
    title: t(($) => $.accounts.renameSubAccount.title),
    description: t(($) => $.accounts.renameSubAccount.description),
    nameLabel: t(($) => $.accounts.renameSubAccount.nameLabel),
    placeholder: t(($) => $.accounts.renameSubAccount.namePlaceholder),
    confirmLabel: t(($) => $.accounts.renameSubAccount.confirm),
    processingMessage: (name: string) => t(($) => $.accounts.renameSubAccount.renaming, { name }),
    successMessage: (name: string) => t(($) => $.accounts.renameSubAccount.success, { name }),
    errorFallback: t(($) => $.accounts.renameSubAccount.error),
  };
}

export const SubAccountNameDialog = ({
  mode,
  inputId,
  initialName,
  isSubmitDisabled,
  onSubmit,
  trigger,
  blockingContent,
}: SubAccountNameDialogConfig) => {
  const { t } = useTranslation();
  const {
    title,
    description,
    nameLabel,
    placeholder,
    confirmLabel,
    processingMessage,
    successMessage,
    errorFallback,
  } = useDialogTranslations(mode);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [phase, setPhase] = useState<Phase>(Phase.Form);
  const [errorMessage, setErrorMessage] = useState('');

  const isBlocking = phase === Phase.Processing;
  const trimmedName = name.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (trimmedName.length < MIN_NAME_LENGTH) return;

    setPhase(Phase.Processing);

    try {
      await onSubmit(trimmedName);
      setPhase(Phase.Success);
    } catch (err) {
      setErrorMessage(err instanceof Error ? mapCanisterError(err) : errorFallback);
      setPhase(Phase.Error);
    }
  };

  const handleRetry = () => setPhase(Phase.Form);

  const handleClose = () => {
    setPhase(Phase.Form);
    setErrorMessage('');
    setOpen(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (isBlocking) return;
    if (!value) {
      setName(initialName);
      setPhase(Phase.Form);
      setErrorMessage('');
    } else {
      setName(initialName);
    }
    setOpen(value);
  };

  useEffect(() => {
    if (phase !== Phase.Success) return;
    const timer = setTimeout(handleClose, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange} dismissible={!isBlocking}>
      {isBlocking && blockingContent?.(trimmedName)}
      {trigger(() => setOpen(true))}

      <ResponsiveDialogContent
        showCloseButton={phase === Phase.Form}
        className="sm:min-h-[240px] sm:max-w-md"
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === Phase.Form && (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor={inputId}>{nameLabel}</Label>
                <Input
                  id={inputId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={placeholder}
                  minLength={MIN_NAME_LENGTH}
                  maxLength={MAX_NAME_LENGTH}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <ResponsiveDialogFooter className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t(($) => $.common.cancel)}
                </Button>
                <Button
                  type="submit"
                  disabled={trimmedName.length < MIN_NAME_LENGTH || isSubmitDisabled?.(trimmedName)}
                >
                  {confirmLabel}
                </Button>
              </ResponsiveDialogFooter>
            </motion.form>
          )}

          {phase === Phase.Processing && (
            <ProcessingPhase message={processingMessage(trimmedName)} />
          )}
          {phase === Phase.Success && <SuccessPhase message={successMessage(trimmedName)} />}
          {phase === Phase.Error && (
            <ErrorPhase errorMessage={errorMessage} onClose={handleClose} onRetry={handleRetry} />
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

function ProcessingPhase({ message }: { message: string }) {
  return (
    <PhaseContainer key="processing" className="items-center justify-center gap-5">
      <ResponsiveDialogTitle className="sr-only">{message}</ResponsiveDialogTitle>
      <AnimatedSpinner />
      <FadeInText delay={0.2}>{message}</FadeInText>
    </PhaseContainer>
  );
}

function SuccessPhase({ message }: { message: string }) {
  return (
    <PhaseContainer key="success" className="items-center justify-center gap-5">
      <ResponsiveDialogTitle className="sr-only">{message}</ResponsiveDialogTitle>
      <AnimatedSuccessIcon />
      <FadeInText delay={0.35} className="max-w-xs">
        {message}
      </FadeInText>
    </PhaseContainer>
  );
}

function ErrorPhase({
  errorMessage,
  onClose,
  onRetry,
}: {
  errorMessage: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <PhaseContainer key="error" className="items-center justify-between">
      <ResponsiveDialogTitle className="sr-only">{errorMessage}</ResponsiveDialogTitle>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AnimatedErrorIcon />
        <FadeInText delay={0.3} className="max-w-xs">
          {errorMessage}
        </FadeInText>
      </div>
      <div className="flex w-full gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t(($) => $.common.close)}
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          {t(($) => $.common.retry)}
        </Button>
      </div>
    </PhaseContainer>
  );
}
