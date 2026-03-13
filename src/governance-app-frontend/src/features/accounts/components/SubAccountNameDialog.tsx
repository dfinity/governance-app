import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';

import { ErrorPhase, ProcessingPhase, SuccessPhase } from './DialogPhases';

enum Phase {
  Form = 'form',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

const SUCCESS_AUTO_CLOSE_MS = 1500;
export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 24;

type SubAccountNameDialogConfig = {
  title: string;
  description: string;
  nameLabel: string;
  placeholder?: string;
  confirmLabel: string;
  processingMessage: (name: string) => string;
  successMessage: (name: string) => string;
  errorFallback: string;
  inputId: string;
  initialName: string;
  isSubmitDisabled?: (trimmedName: string) => boolean;
  onSubmit: (trimmedName: string) => Promise<void>;
  trigger: (open: () => void) => ReactNode;
  blockingContent?: (name: string) => ReactNode;
};

export const SubAccountNameDialog = ({
  title,
  description,
  nameLabel,
  placeholder,
  confirmLabel,
  processingMessage,
  successMessage,
  errorFallback,
  inputId,
  initialName,
  isSubmitDisabled,
  onSubmit,
  trigger,
  blockingContent,
}: SubAccountNameDialogConfig) => {
  const { t } = useTranslation();
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
      setErrorMessage(err instanceof Error ? err.message : errorFallback);
      setPhase(Phase.Error);
    }
  };

  const handleRetry = () => setPhase(Phase.Form);

  const handleClose = () => {
    setName(initialName);
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
                  disabled={
                    trimmedName.length < MIN_NAME_LENGTH || isSubmitDisabled?.(trimmedName)
                  }
                >
                  {confirmLabel}
                </Button>
              </ResponsiveDialogFooter>
            </motion.form>
          )}

          {phase === Phase.Processing && <ProcessingPhase message={processingMessage(trimmedName)} />}
          {phase === Phase.Success && <SuccessPhase message={successMessage(trimmedName)} />}
          {phase === Phase.Error && (
            <ErrorPhase errorMessage={errorMessage} onClose={handleClose} onRetry={handleRetry} />
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
