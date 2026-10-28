import { Usb, XIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DrawerClose } from '@components/Drawer';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useMediaQuery } from '@hooks/useMediaQuery';

type Props = {
  open: boolean;
  /** What the user checks on the device screen. */
  description: ReactNode;
  /** The values to compare with the device screen, for example a principal. */
  detail?: ReactNode;
  /** The user closes the dialog and the app ignores the result of the device call. */
  onCancel: () => void;
};

/**
 * A dialog shown while a Ledger device waits for the user to approve a call.
 *
 * Every device action shows it. A close (the X, the Escape key, the overlay, or a drag of
 * the drawer) cancels the wait in the app only: the device keeps the request on its screen
 * until the user answers there, and the dialog says so.
 *
 * The drawer has no X of its own, so the phone layout adds one: a drag or an overlay tap
 * is not an option for a screen reader or a switch.
 */
export const DeviceApprovalDialog = ({ open, description, detail, onCancel }: Props) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <ResponsiveDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <ResponsiveDialogContent
        className="flex flex-col focus:outline-none md:max-w-sm"
        data-testid="device-approval-dialog"
      >
        {!isDesktop && (
          <DrawerClose
            className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden [&_svg]:size-4"
            data-testid="device-approval-drawer-close"
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">{t(($) => $.common.close)}</span>
          </DrawerClose>
        )}
        <div className="flex flex-col items-center gap-4 px-4 pb-4 text-center md:px-0 md:pb-0">
          <motion.div
            className="relative flex size-16 items-center justify-center rounded-full bg-primary/10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <span
              className="animate-approval-pulse absolute inset-0 rounded-full bg-primary/10"
              aria-hidden="true"
            />
            <Usb className="relative size-8 text-primary" aria-hidden="true" />
          </motion.div>
          <ResponsiveDialogTitle>{t(($) => $.common.ledgerApproval.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
          {detail && (
            <div
              className="w-full rounded-md bg-muted px-3 py-2 font-mono text-xs wrap-anywhere text-foreground"
              data-testid="device-approval-detail"
            >
              {detail}
            </div>
          )}
          <p className="text-sm text-muted-foreground" role="status">
            {t(($) => $.common.ledgerApproval.waiting)}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="device-approval-close-hint">
            {t(($) => $.common.ledgerApproval.closeHint)}{' '}
            {t(($) => $.common.ledgerApproval.answerPending)}
          </p>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
