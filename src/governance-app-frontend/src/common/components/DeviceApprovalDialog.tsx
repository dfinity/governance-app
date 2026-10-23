import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { ProcessingSpinner } from '@components/ProcessingSpinner';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { usePendingDeviceAction } from '@hooks/useDeviceAction';

const stay = (event: Event) => event.preventDefault();

/**
 * Blocks the page while a Ledger device waits for the user's approval.
 *
 * Mounted once in the authenticated layout. `runDeviceAction` opens it; the overlay and
 * Escape do not close it, only the device answer or the Cancel button.
 */
export const DeviceApprovalDialog = () => {
  const { t } = useTranslation();
  const pending = usePendingDeviceAction();

  return (
    <ResponsiveDialog open={pending !== null} dismissible={false}>
      <ResponsiveDialogContent
        className="flex flex-col items-center gap-5 pb-6 text-center md:max-w-md"
        showCloseButton={false}
        onInteractOutside={stay}
        onEscapeKeyDown={stay}
        data-testid="device-approval-dialog"
      >
        <ProcessingSpinner />
        <ResponsiveDialogHeader className="items-center text-center">
          <ResponsiveDialogTitle>{t(($) => $.common.deviceApproval.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="max-w-xs">
            {t(($) => $.common.deviceApproval.description)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Button variant="outline" size="lg" onClick={() => pending?.cancel()}>
          {t(($) => $.common.cancel)}
        </Button>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
