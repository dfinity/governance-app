import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { cn } from '@utils/shadcn';
import { useDeviceAnswerPending } from '@common/ledger/approvedDeviceCall';
import type { Signer } from '@common/ledger/signer';

/**
 * Tells the user to answer on the Ledger device while a cancelled request waits for its answer.
 *
 * A device call waits for the answer to every cancelled request, its own or another flow's,
 * before the device takes it, so the line shows for a Ledger signer only. An Internet
 * Identity call never waits for the device.
 */
export const DeviceAnswerHint = ({
  signer,
  className,
}: {
  signer?: Signer;
  className?: string;
}) => {
  const { t } = useTranslation();
  const answerPending = useDeviceAnswerPending();

  if (signer?.kind !== 'ledger' || !answerPending) return null;

  return (
    <motion.p
      className={cn('text-xs text-muted-foreground', className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {t(($) => $.common.ledgerApproval.answerPending)}
    </motion.p>
  );
};
