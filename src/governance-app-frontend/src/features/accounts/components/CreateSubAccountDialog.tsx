import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { ErrorPhase, ProcessingPhase, SuccessPhase } from './DialogPhases';

enum Phase {
  Form = 'form',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

const SUCCESS_AUTO_CLOSE_MS = 1500;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 24;

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

          {phase === Phase.Processing && (
            <ProcessingPhase
              message={t(($) => $.accounts.createSubAccount.creating, { name: trimmedName })}
            />
          )}
          {phase === Phase.Success && (
            <SuccessPhase
              message={t(($) => $.accounts.createSubAccount.success, { name: trimmedName })}
            />
          )}
          {phase === Phase.Error && (
            <ErrorPhase errorMessage={errorMessage} onClose={handleClose} onRetry={handleRetry} />
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
