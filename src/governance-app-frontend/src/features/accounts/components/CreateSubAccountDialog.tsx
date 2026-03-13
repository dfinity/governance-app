import { AlertTriangle, Loader, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedCheckmark } from '@components/AnimatedCheckmark';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';

import { useCreateSubAccount } from '../hooks/useCreateSubAccount';

enum Phase {
  Form = 'form',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

const SUCCESS_AUTO_CLOSE_MS = 1500;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 24;

function ProcessingPhase({ name }: { name: string }) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="processing"
      className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <ResponsiveDialogTitle className="sr-only">
        {t(($) => $.accounts.createSubAccount.creating, { name })}
      </ResponsiveDialogTitle>
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
        {t(($) => $.accounts.createSubAccount.creating, { name })}
      </motion.p>
    </motion.div>
  );
}

function SuccessPhase({ name }: { name: string }) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="success"
      className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ResponsiveDialogTitle className="sr-only">
        {t(($) => $.accounts.createSubAccount.success, { name })}
      </ResponsiveDialogTitle>
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
        {t(($) => $.accounts.createSubAccount.success, { name })}
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
      <ResponsiveDialogTitle className="sr-only">
        {t(($) => $.accounts.createSubAccount.error)}
      </ResponsiveDialogTitle>
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

export const CreateSubAccountDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>(Phase.Form);
  const [errorMessage, setErrorMessage] = useState('');
  const createSubAccount = useCreateSubAccount();

  const isBlocking = phase === Phase.Processing;
  const trimmedName = name.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (trimmedName.length < MIN_NAME_LENGTH) return;

    setPhase(Phase.Processing);

    try {
      await createSubAccount.mutateAsync(trimmedName);
      setPhase(Phase.Success);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t(($) => $.accounts.createSubAccount.error),
      );
      setPhase(Phase.Error);
    }
  };

  const handleRetry = () => setPhase(Phase.Form);

  const handleClose = () => {
    setName('');
    setPhase(Phase.Form);
    setErrorMessage('');
    setOpen(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (isBlocking) return;
    if (!value) {
      setName('');
      setPhase(Phase.Form);
      setErrorMessage('');
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
      <NavigationBlockerDialog
        isBlocked={isBlocking}
        description={t(($) => $.accounts.createSubAccount.creating, { name: trimmedName })}
      />
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {t(($) => $.accounts.createSubAccount.button)}
      </Button>

      <ResponsiveDialogContent
        showCloseButton={phase === Phase.Form}
        className="sm:min-h-[240px] sm:max-w-md"
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === Phase.Form && (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="flex h-full flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  {t(($) => $.accounts.createSubAccount.title)}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t(($) => $.accounts.createSubAccount.description)}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor="subaccount-name">
                  {t(($) => $.accounts.createSubAccount.nameLabel)}
                </Label>
                <Input
                  id="subaccount-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={MIN_NAME_LENGTH}
                  maxLength={MAX_NAME_LENGTH}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <ResponsiveDialogFooter className="mt-auto flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t(($) => $.common.cancel)}
                </Button>
                <Button type="submit" disabled={trimmedName.length < MIN_NAME_LENGTH}>
                  {t(($) => $.accounts.createSubAccount.confirm)}
                </Button>
              </ResponsiveDialogFooter>
            </motion.form>
          )}

          {phase === Phase.Processing && <ProcessingPhase name={trimmedName} />}
          {phase === Phase.Success && <SuccessPhase name={trimmedName} />}
          {phase === Phase.Error && (
            <ErrorPhase errorMessage={errorMessage} onClose={handleClose} onRetry={handleRetry} />
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
