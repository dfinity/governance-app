import { AlertTriangle, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { DIALOG_RESET_DELAY_MS, SUCCESS_AUTO_CLOSE_MS } from '@constants/extra';
import { mapCanisterError } from '@utils/errors';
import { cn } from '@utils/shadcn';

import { AnimatedCheckmark } from './AnimatedCheckmark';

type MutationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  processingMessage: string;
  successMessage: string;
  navBlockerDescription: string;
  errorFallbackMessage?: string;

  className?: string;
  'data-testid'?: string;

  children: (ctx: {
    execute: (fn: () => Promise<unknown>) => void;
    close: () => void;
  }) => React.ReactNode;
};

enum Phase {
  Idle = 'idle',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

export function MutationDialog({
  open,
  onOpenChange,
  processingMessage,
  successMessage,
  navBlockerDescription,
  errorFallbackMessage,
  className,
  'data-testid': dataTestId,
  children,
}: MutationDialogProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(Phase.Idle);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastMutation, setLastMutation] = useState<{ fn: () => Promise<unknown> } | null>(null);

  const isProcessing = phase === Phase.Processing;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const execute = useCallback(
    async (fn: () => Promise<unknown>) => {
      setLastMutation({ fn });
      setPhase(Phase.Processing);
      try {
        await fn();
        setPhase(Phase.Success);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? mapCanisterError(err)
            : (errorFallbackMessage ?? t(($) => $.common.unknownError)),
        );
        setPhase(Phase.Error);
      }
    },
    [errorFallbackMessage, t],
  );

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (isProcessing && !value) return;
      onOpenChange(value);
    },
    [isProcessing, onOpenChange],
  );

  useEffect(() => {
    if (phase !== Phase.Success) return;
    const timer = setTimeout(close, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase, close]);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setPhase(Phase.Idle);
      setErrorMessage('');
      setLastMutation(null);
    }, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <>
      <NavigationBlockerDialog isBlocked={isProcessing} description={navBlockerDescription} />

      <ResponsiveDialog open={open} onOpenChange={handleOpenChange} dismissible={!isProcessing}>
        <ResponsiveDialogContent
          className={cn('flex max-h-[90vh] flex-col', className)}
          showCloseButton={phase === Phase.Idle}
          data-testid={dataTestId}
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === Phase.Idle && (
              <motion.div
                key="body"
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {children({ execute, close })}
              </motion.div>
            )}

            {phase === Phase.Processing && (
              <PhaseContainer key="processing" className="items-center justify-center gap-5">
                <ResponsiveDialogTitle className="sr-only">
                  {processingMessage}
                </ResponsiveDialogTitle>
                <AnimatedSpinner />
                <FadeInText delay={0.2}>{processingMessage}</FadeInText>
              </PhaseContainer>
            )}

            {phase === Phase.Success && (
              <PhaseContainer key="success" className="items-center justify-center gap-5">
                <ResponsiveDialogTitle className="sr-only">{successMessage}</ResponsiveDialogTitle>
                <AnimatedSuccessIcon />
                <FadeInText delay={0.35} className="max-w-xs">
                  {successMessage}
                </FadeInText>
              </PhaseContainer>
            )}

            {phase === Phase.Error && (
              <PhaseContainer key="error" className="items-center justify-between">
                <ResponsiveDialogTitle className="sr-only">{errorMessage}</ResponsiveDialogTitle>
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <AnimatedErrorIcon />
                  <FadeInText delay={0.3} className="max-w-xs">
                    {errorMessage}
                  </FadeInText>
                </div>
                <div className="flex w-full gap-3 pt-4">
                  <Button variant="outline" size="xl" className="flex-1" onClick={close}>
                    {t(($) => $.common.close)}
                  </Button>
                  <Button
                    size="xl"
                    className="flex-1"
                    onClick={() => lastMutation && execute(lastMutation.fn)}
                  >
                    {t(($) => $.common.retry)}
                  </Button>
                </div>
              </PhaseContainer>
            )}
          </AnimatePresence>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

function PhaseContainer({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      className={cn('flex min-h-[200px] flex-1 flex-col pb-4 text-center md:pb-0', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function AnimatedSpinner() {
  return (
    <motion.div
      className="flex size-16 items-center justify-center rounded-full bg-primary/10"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <Loader className="size-8 animate-spin text-primary" />
    </motion.div>
  );
}

function AnimatedSuccessIcon() {
  return (
    <motion.div
      className="flex size-16 items-center justify-center rounded-full bg-green-600/10"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <AnimatedCheckmark />
    </motion.div>
  );
}

function AnimatedErrorIcon() {
  return (
    <motion.div
      className="flex size-14 items-center justify-center rounded-full bg-destructive/10"
      initial={{ scale: 0.8, rotate: 0 }}
      animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <AlertTriangle className="size-8 text-destructive" />
    </motion.div>
  );
}

function FadeInText({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.p
      className={cn('text-sm font-medium text-muted-foreground', className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {children}
    </motion.p>
  );
}
