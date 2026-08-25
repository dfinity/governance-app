import { motion } from 'motion/react';

import { Spinner } from '@components/Spinner';

/**
 * The spinner shown while a mutation runs.
 *
 * Every processing screen uses this one, so a transfer, a stake, and a vote all
 * look the same while they wait.
 */
export const ProcessingSpinner = () => (
  <motion.div
    className="flex size-16 items-center justify-center rounded-full bg-primary/10"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
  >
    <Spinner className="size-8 text-primary" />
  </motion.div>
);
