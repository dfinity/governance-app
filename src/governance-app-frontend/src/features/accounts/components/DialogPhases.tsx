import { AlertTriangle, Loader } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { AnimatedCheckmark } from '@components/AnimatedCheckmark';
import { Button } from '@components/button';
import { ResponsiveDialogTitle } from '@components/ResponsiveDialog';

export function ProcessingPhase({ message }: { message: string }) {
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

export function SuccessPhase({ message }: { message: string }) {
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

export function ErrorPhase({
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
