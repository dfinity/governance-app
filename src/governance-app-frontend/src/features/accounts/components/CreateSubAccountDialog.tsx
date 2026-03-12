import { AlertTriangle, Loader, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
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

import { useCreateSubAccount } from '../hooks/useCreateSubAccount';

enum Phase {
  Form = 'form',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

const SUCCESS_AUTO_CLOSE_MS = 1500;

export const CreateSubAccountDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>(Phase.Form);
  const [errorMessage, setErrorMessage] = useState('');
  const createSubAccount = useCreateSubAccount();

  const isBlocking = phase === Phase.Processing;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setPhase(Phase.Processing);

    try {
      await createSubAccount.mutateAsync(trimmed);
      setPhase(Phase.Success);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t(($) => $.accounts.createSubAccount.error),
      );
      setPhase(Phase.Error);
    }
  };

  const handleRetry = () => {
    setPhase(Phase.Form);
  };

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
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {t(($) => $.accounts.createSubAccount.button)}
      </Button>

      <ResponsiveDialogContent
        showCloseButton={!isBlocking}
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
                  placeholder={t(($) => $.accounts.createSubAccount.namePlaceholder)}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <ResponsiveDialogFooter className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t(($) => $.common.cancel)}
                </Button>
                <Button type="submit" disabled={!name.trim()}>
                  {t(($) => $.accounts.createSubAccount.confirm)}
                </Button>
              </ResponsiveDialogFooter>
            </motion.form>
          )}

          {phase === Phase.Processing && (
            <motion.div
              key="processing"
              className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) => $.accounts.createSubAccount.creating, { name: name.trim() })}
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
                {t(($) => $.accounts.createSubAccount.creating, { name: name.trim() })}
              </motion.p>
            </motion.div>
          )}

          {phase === Phase.Success && (
            <motion.div
              key="success"
              className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) => $.accounts.createSubAccount.success, { name: name.trim() })}
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
                {t(($) => $.accounts.createSubAccount.success, { name: name.trim() })}
              </motion.p>
            </motion.div>
          )}

          {phase === Phase.Error && (
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
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  {t(($) => $.common.close)}
                </Button>
                <Button className="flex-1" onClick={handleRetry}>
                  {t(($) => $.common.retry)}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
