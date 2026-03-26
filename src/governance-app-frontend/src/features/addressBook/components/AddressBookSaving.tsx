import { Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedSuccessIcon, FadeInText, PhaseContainer } from '@components/MutationPhases';
import { ResponsiveDialogTitle } from '@components/ResponsiveDialog';

const DRAW_DURATION = 1;

function AnimatedBookIcon() {
  const strokeProps = {
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <motion.svg className="size-14 text-muted-foreground" viewBox="0 0 24 24">
      <motion.path
        d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
        {...strokeProps}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
        {...strokeProps}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
      />
      <motion.line
        x1="6"
        y1="8"
        x2="10"
        y2="8"
        {...strokeProps}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      />
      <motion.line
        x1="6"
        y1="12"
        x2="10"
        y2="12"
        {...strokeProps}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      />
      <motion.line
        x1="14"
        y1="8"
        x2="18"
        y2="8"
        {...strokeProps}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
      <motion.line
        x1="14"
        y1="12"
        x2="18"
        y2="12"
        {...strokeProps}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.8 }}
      />
    </motion.svg>
  );
}

export const AddressBookSuccess: React.FC<{ message: string }> = ({ message }) => {
  return (
    <PhaseContainer key="success" className="items-center justify-center gap-5">
      <ResponsiveDialogTitle className="sr-only">{message}</ResponsiveDialogTitle>
      <AnimatedSuccessIcon />
      <FadeInText delay={0.35}>{message}</FadeInText>
    </PhaseContainer>
  );
};

export const AddressBookUpdating = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'draw' | 'spin'>('draw');

  useEffect(() => {
    const timer = setTimeout(() => setPhase('spin'), DRAW_DURATION * 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 text-center">
      <motion.div
        className="flex size-28 items-center justify-center rounded-full bg-primary/10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          rotate: phase === 'spin' ? 360 : 0,
        }}
        transition={
          phase === 'spin'
            ? {
                rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' },
                scale: { type: 'spring', stiffness: 200, damping: 15 },
              }
            : { type: 'spring', stiffness: 200, damping: 15, duration: 0.5 }
        }
      >
        <AnimatePresence mode="wait">
          {phase === 'draw' ? (
            <motion.div key="book" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
              <AnimatedBookIcon />
            </motion.div>
          ) : (
            <motion.div
              key="spinner"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Loader className="size-10 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <motion.p
        className="text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        {t(($) => $.addressBook.updatingAddressBook)}
      </motion.p>
    </div>
  );
};
