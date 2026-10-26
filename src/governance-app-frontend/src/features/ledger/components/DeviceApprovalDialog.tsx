import { Usb } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';

type Props = {
  open: boolean;
  /** What the user checks on the device screen. */
  description: string;
  /** The value to compare with the device screen, for example a principal. */
  detail?: string;
  /** The user closes the dialog and the app ignores the result of the device call. */
  onCancel: () => void;
};

/**
 * A blocking dialog shown while a Ledger device waits for the user to approve a call.
 *
 * Every device action shows it. The overlay and the Escape key do not close it, only the
 * Cancel button does: the device keeps the request on its screen until the user answers
 * there, so a silent close would leave the device and the app out of step.
 */
export const DeviceApprovalDialog = ({ open, description, detail, onCancel }: Props) => {
  const { t } = useTranslation();

  return (
    <ResponsiveDialog open={open} onOpenChange={() => {}} dismissible={false}>
      <ResponsiveDialogContent
        className="flex flex-col focus:outline-none md:max-w-sm"
        showCloseButton={false}
        data-testid="device-approval-dialog"
      >
        <div className="flex flex-col items-center gap-4 px-4 pb-4 text-center md:px-0 md:pb-0">
          <motion.div
            className="flex size-16 items-center justify-center rounded-full bg-primary/10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <Usb className="size-8 text-primary" aria-hidden="true" />
          </motion.div>
          <ResponsiveDialogTitle>{t(($) => $.common.ledgerApproval.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
          {detail && (
            <p
              className="rounded-md bg-muted px-3 py-2 font-mono text-xs wrap-anywhere text-foreground"
              data-testid="device-approval-detail"
            >
              {detail}
            </p>
          )}
          <Button variant="outline" onClick={onCancel}>
            {t(($) => $.common.cancel)}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
