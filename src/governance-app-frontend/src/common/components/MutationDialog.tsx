import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import { ProcessingSpinner } from '@components/ProcessingSpinner';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { DIALOG_RESET_DELAY_MS, SUCCESS_AUTO_CLOSE_MS } from '@constants/extra';
import { isDeviceActionCancelled } from '@hooks/useDeviceAction';
import { mapCanisterError } from '@utils/errors';
import { cn } from '@utils/shadcn';
import { useDeviceAnswerPending } from '@common/ledger/approvedDeviceCall';
import type { Signer } from '@common/ledger/signer';

import { AnimatedCheckmark } from './AnimatedCheckmark';

type MutationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  processingMessage: string;
  successMessage: string;
  navBlockerDescription: string;
  errorFallbackMessage?: string;
  /**
   * Who signs the mutation. A Ledger device signer waits for the device, so after a cancel
   * the processing phase tells the user to answer on it.
   */
  signer?: Signer;

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
  signer,
  className,
  'data-testid': dataTestId,
  children,
}: MutationDialogProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(Phase.Idle);
  // On from `execute` until the processing content mounts.
  const [processingPending, setProcessingPending] = useState(false);
  // On when the success content mounts.
  const [successMounted, setSuccessMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastMutation, setLastMutation] = useState<{ fn: () => Promise<unknown> } | null>(null);
  const deviceAnswerPending = useDeviceAnswerPending();

  // If the mutation ends while the body still fades out, AnimatePresence ("wait" mode)
  // never shows the next content. So the end waits for the processing content.
  const visiblePhase = processingPending ? Phase.Processing : phase;
  const isProcessing = visiblePhase === Phase.Processing;
  // A device call waits for the answer to every cancelled request, its own or another
  // flow's, before the device takes it. An Internet Identity call never waits for it.
  const waitsForDevice = signer?.kind === 'ledger' && deviceAnswerPending;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const execute = async (fn: () => Promise<unknown>) => {
    setLastMutation({ fn });
    setProcessingPending(true);
    setSuccessMounted(false);
    setPhase(Phase.Processing);
    try {
      await fn();
      setPhase(Phase.Success);
    } catch (err) {
      // A cancel on the Ledger approval dialog is not an error: the form shows again.
      if (isDeviceActionCancelled(err)) {
        setPhase(Phase.Idle);
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? mapCanisterError(err)
          : (errorFallbackMessage ?? t(($) => $.common.unknownError)),
      );
      setPhase(Phase.Error);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (isProcessing && !value) return;
    onOpenChange(value);
  };

  useEffect(() => {
    if (!successMounted) return;
    const timer = setTimeout(close, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [successMounted, close]);

  const resetPhase = useEffectEvent(() => {
    setPhase(Phase.Idle);
    setProcessingPending(false);
    setSuccessMounted(false);
    setErrorMessage('');
    setLastMutation(null);
  });

  // The reset waits for the close animation. A reopen within that delay
  // cancels the timer, so the open resets at once instead.
  useEffect(() => {
    if (open) {
      resetPhase();
      return;
    }
    const timer = setTimeout(resetPhase, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <>
      <NavigationBlockerDialog isBlocked={isProcessing} description={navBlockerDescription} />

      <ResponsiveDialog open={open} onOpenChange={handleOpenChange} dismissible={!isProcessing}>
        <ResponsiveDialogContent
          className={cn(
            'flex max-h-[90vh] flex-col focus:outline-none md:max-w-md',
            visiblePhase === Phase.Idle && className,
          )}
          showCloseButton={visiblePhase === Phase.Idle}
          data-testid={dataTestId}
        >
          <AnimatePresence mode="wait" initial={false}>
            {visiblePhase === Phase.Idle && (
              <motion.div
                key="body"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {children({ execute, close })}
              </motion.div>
            )}

            {visiblePhase === Phase.Processing && (
              <PhaseContainer
                key="processing"
                className="items-center justify-center gap-5"
                onMount={() => setProcessingPending(false)}
              >
                <ResponsiveDialogTitle className="sr-only">
                  {processingMessage}
                </ResponsiveDialogTitle>
                <ProcessingSpinner />
                <div className="flex flex-col items-center gap-2">
                  <FadeInText delay={0.2}>{processingMessage}</FadeInText>
                  {waitsForDevice && (
                    <FadeInText delay={0} className="text-xs font-normal">
                      {t(($) => $.common.ledgerApproval.answerPending)}
                    </FadeInText>
                  )}
                </div>
              </PhaseContainer>
            )}

            {visiblePhase === Phase.Success && (
              <PhaseContainer
                key="success"
                className="items-center justify-center gap-5"
                onMount={() => setSuccessMounted(true)}
              >
                <ResponsiveDialogTitle className="sr-only">{successMessage}</ResponsiveDialogTitle>
                <AnimatedSuccessIcon />
                <FadeInText delay={0.35}>{successMessage}</FadeInText>
              </PhaseContainer>
            )}

            {visiblePhase === Phase.Error && (
              <PhaseContainer key="error" className="items-center justify-between">
                <ResponsiveDialogTitle className="sr-only">{errorMessage}</ResponsiveDialogTitle>
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <AnimatedErrorIcon />
                  <FadeInText delay={0.3}>{errorMessage}</FadeInText>
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

export function MutationDialogHeader({
  children,
  className,
  ...props
}: React.ComponentProps<typeof ResponsiveDialogHeader>) {
  return (
    <ResponsiveDialogHeader className={cn('shrink-0', className)} {...props}>
      {children}
    </ResponsiveDialogHeader>
  );
}

export function MutationDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex-1 overflow-y-auto', className)}>{children}</div>;
}

export function MutationDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-2 px-4 pt-4 pb-4 md:flex-row md:gap-3 md:px-0 md:pb-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

function PhaseContainer({
  children,
  className,
  onMount,
  ...props
}: React.ComponentProps<typeof motion.div> & { onMount?: () => void }) {
  const handleMount = useEffectEvent(() => onMount?.());

  // A remount (Dialog to Drawer at the breakpoint) skips the enter animation.
  // So an effect calls `onMount`, not `onAnimationComplete`.
  useEffect(() => {
    handleMount();
  }, []);

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
      className={cn('max-w-xs text-sm font-medium wrap-anywhere text-muted-foreground', className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {children}
    </motion.p>
  );
}
