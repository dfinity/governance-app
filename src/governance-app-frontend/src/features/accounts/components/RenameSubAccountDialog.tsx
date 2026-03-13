import { Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
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

import { useRenameSubAccount } from '../hooks/useRenameSubAccount';
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

type Props = {
  accountId: string;
  currentName: string;
};

export const RenameSubAccountDialog = ({ accountId, currentName }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [phase, setPhase] = useState<Phase>(Phase.Form);
  const [errorMessage, setErrorMessage] = useState('');
  const renameSubAccount = useRenameSubAccount();

  const isBlocking = phase === Phase.Processing;
  const trimmedName = name.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmedName || trimmedName === currentName) return;

    setPhase(Phase.Processing);

    try {
      await renameSubAccount.mutateAsync({ accountId, newName: trimmedName });
      setPhase(Phase.Success);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t(($) => $.accounts.renameSubAccount.error),
      );
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
      setName(currentName);
      setPhase(Phase.Form);
      setErrorMessage('');
    } else {
      setName(currentName);
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
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={() => setOpen(true)}
        aria-label={t(($) => $.accounts.renameSubAccount.ariaLabel)}
        title={t(($) => $.accounts.renameSubAccount.ariaLabel)}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  {t(($) => $.accounts.renameSubAccount.title)}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t(($) => $.accounts.renameSubAccount.description)}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor={`subaccount-rename-${accountId}`}>
                  {t(($) => $.accounts.renameSubAccount.nameLabel)}
                </Label>
                <Input
                  id={`subaccount-rename-${accountId}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(($) => $.accounts.renameSubAccount.namePlaceholder)}
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
                  disabled={trimmedName.length < MIN_NAME_LENGTH || trimmedName === currentName}
                >
                  {t(($) => $.accounts.renameSubAccount.confirm)}
                </Button>
              </ResponsiveDialogFooter>
            </motion.form>
          )}

          {phase === Phase.Processing && (
            <ProcessingPhase
              message={t(($) => $.accounts.renameSubAccount.renaming, { name: trimmedName })}
            />
          )}
          {phase === Phase.Success && (
            <SuccessPhase
              message={t(($) => $.accounts.renameSubAccount.success, { name: trimmedName })}
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
