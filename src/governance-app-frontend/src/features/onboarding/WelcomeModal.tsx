import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, CheckCircle2, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useDetectAdvancedFeatures } from '@hooks/useDetectAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { successNotification } from '@utils/notification';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@common/components/ResponsiveDialog';

export function WelcomeModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(
    () => typeof window !== 'undefined' && !localStorage.getItem(WELCOME_MODAL_STORAGE_KEY),
  );

  const { isDetecting, detectedFeatures, error } = useDetectAdvancedFeatures();
  const { setFeature } = useAdvancedFeatures();

  const hasError = nonNullish(error);

  const featureLabels: Record<string, string> = {
    [AdvancedFeature.Subaccounts]: t(($) => $.welcomeModal.subaccountsDetected),
    [AdvancedFeature.AdvancedFollowing]: t(($) => $.welcomeModal.advancedFollowingDetected),
  };

  const enabledFeatures: Array<{ label: string }> = Object.entries(detectedFeatures)
    .filter(([, detected]) => detected === true)
    .map(([key]) => ({ label: featureLabels[key] ?? key }));

  const handleClose = () => {
    for (const [key, detected] of Object.entries(detectedFeatures)) {
      setFeature(key as keyof typeof detectedFeatures, detected ?? false);
    }
    setIsOpen(false);
    localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
    successNotification({
      description: t(($) => $.welcomeModal.toast),
    });
  };

  return (
    <>
      <NavigationBlockerDialog
        isBlocked={isOpen && isDetecting}
        description={t(($) => $.welcomeModal.detectingNavBlock)}
      />
      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen} dismissible={!isDetecting}>
        <ResponsiveDialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={isDetecting ? (e) => e.preventDefault() : undefined}
          showCloseButton={false}
          className="flex flex-col gap-0 overflow-hidden p-0 lg:max-w-xl"
          data-testid="welcome-modal"
        >
          <img
            src="/welcome-image.svg"
            alt="Welcome"
            className="mt-4 w-full md:mt-0 md:rounded-t-lg"
          />
          <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-8 lg:px-8 lg:pb-0">
            <ResponsiveDialogTitle className="text-center text-2xl">
              {t(($) => $.welcomeModal.title)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-center text-[15px] text-pretty text-muted-foreground">
              {t(($) => $.welcomeModal.content)}
            </ResponsiveDialogDescription>
          </div>
          <ResponsiveDialogFooter className="px-6 pt-6 pb-6 lg:px-8 lg:pb-8">
            <div className="flex w-full flex-col items-center gap-3">
              <AnimatePresence mode="wait">
                {isDetecting ? (
                  <DetectingFeatures />
                ) : (
                  <DetectionResult
                    detectedFeatures={enabledFeatures}
                    hasError={hasError}
                    onContinue={handleClose}
                  />
                )}
              </AnimatePresence>
            </div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

function DetectingFeatures() {
  const { t } = useTranslation();

  return (
    <motion.div
      key="detecting"
      className="flex items-center gap-3 py-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex size-9 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.15, 1] }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/30"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.75], opacity: [0.7, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.5,
            repeatDelay: 0.2,
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 0.3, delay: 0.2 },
            scale: { type: 'spring', stiffness: 200, damping: 12, delay: 0.2 },
            rotate: { duration: 2, repeat: Infinity, ease: 'linear', delay: 0.4 },
          }}
        >
          <Loader className="size-4 text-primary/50" />
        </motion.div>
      </div>
      <motion.span
        className="text-sm text-muted-foreground"
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {t(($) => $.welcomeModal.detecting)}
      </motion.span>
    </motion.div>
  );
}

function DetectionResult({
  detectedFeatures,
  hasError,
  onContinue,
}: {
  detectedFeatures: Array<{ label: string }>;
  hasError: boolean;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const hasDetected = detectedFeatures.length > 0;

  return (
    <motion.div
      key="result"
      className="flex w-full flex-col items-center gap-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {hasDetected && (
        <motion.div
          className="w-full rounded-lg border bg-muted/30 px-4 py-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <ul className="space-y-2">
            {detectedFeatures.map((feature, i) => (
              <motion.li
                key={feature.label}
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.3 + i * 0.1 }}
              >
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{feature.label}</span>
              </motion.li>
            ))}
          </ul>
          <motion.p
            className="mt-3 border-t pt-2.5 text-center text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + detectedFeatures.length * 0.1 }}
          >
            {t(($) => $.welcomeModal.detectedHint)}
          </motion.p>
        </motion.div>
      )}
      {hasError && (
        <motion.div
          className="flex w-full items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-500/20 dark:bg-orange-500/10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <AlertTriangle className="size-4 shrink-0 text-orange-500 dark:text-orange-400" />
          <span className="text-sm text-orange-800 dark:text-orange-300">
            {t(($) => $.welcomeModal.detectingError)}
          </span>
        </motion.div>
      )}
      <Button
        onClick={onContinue}
        className="w-full"
        size="xxl"
        data-testid="welcome-modal-cta-btn"
      >
        {t(($) => $.welcomeModal.cta)}
      </Button>
    </motion.div>
  );
}
