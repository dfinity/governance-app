import { AlertTriangle, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedCheckmark } from '@components/AnimatedCheckmark';
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

import { DialogMode } from '../types';

enum Phase {
  Form = 'form',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

const SUCCESS_AUTO_CLOSE_MS = 1500;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 24;

type SubAccountNameDialogConfig = {
  mode: DialogMode;
  inputId: string;
  initialName: string;
  isSubmitDisabled?: (trimmedName: string) => boolean;
  onSubmit: (trimmedName: string) => Promise<void>;
  trigger: (open: () => void) => ReactNode;
  blockingContent?: (name: string) => ReactNode;
};

function useDialogTranslations(mode: DialogMode) {
  const { t } = useTranslation();

  if (mode === DialogMode.Create) {
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
      setErrorMessage(err instanceof Error ? err.message : errorFallback);
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
    <motion.div
      key="processing"
      className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <ResponsiveDialogTitle className="sr-only">{message}</ResponsiveDialogTitle>
      <motion.div
        className="flex size-16 items-center justify-center rounded-full bg-primary/10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <Loader className="size-8 animate-spin text-primary" />
      </motion.div>
      <motion.p
        className="text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}

function SuccessPhase({ message }: { message: string }) {
  return (
    <motion.div
      key="success"
      className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ResponsiveDialogTitle className="sr-only">{message}</ResponsiveDialogTitle>
      <motion.div
        className="flex size-16 items-center justify-center rounded-full bg-green-600/10"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <AnimatedCheckmark />
      </motion.div>
      <motion.p
        className="max-w-xs text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        {message}
      </motion.p>
    </motion.div>
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
    <motion.div
      key="error"
      className="flex h-full flex-col items-center justify-between py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ResponsiveDialogTitle className="sr-only">{errorMessage}</ResponsiveDialogTitle>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <motion.div
          className="flex size-14 items-center justify-center rounded-full bg-destructive/10"
          initial={{ scale: 0.8, rotate: 0 }}
          animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <AlertTriangle className="size-8 text-destructive" />
        </motion.div>
        <motion.p
          className="max-w-xs text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {errorMessage}
        </motion.p>
      </div>
      <div className="flex w-full gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t(($) => $.common.close)}
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          {t(($) => $.common.retry)}
        </Button>
      </div>
    </motion.div>
  );
}
