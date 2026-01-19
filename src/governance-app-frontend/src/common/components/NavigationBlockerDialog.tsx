import { useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './AlertDialog';
import { buttonVariants } from './button';

type Props = {
  isBlocked: boolean;
  title?: string;
  description?: string;
  stayButtonText?: string;
  leaveButtonText?: string;
};

export function NavigationBlockerDialog({
  isBlocked,
  title,
  description,
  stayButtonText,
  leaveButtonText,
}: Props) {
  const { t } = useTranslation();

  const { status, proceed, reset } = useBlocker({
    shouldBlockFn: () => isBlocked,
    withResolver: true,
    enableBeforeUnload: isBlocked,
  });

  const dialogTitle = title ?? t(($) => $.common.warning);
  const dialogDescription = description ?? t(($) => $.common.confirmNavigation);
  const stayText = stayButtonText ?? t(($) => $.common.cancel);
  const leaveText = leaveButtonText ?? t(($) => $.common.leave);

  return (
    <AlertDialog open={status === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={reset}>{stayText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={proceed}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {leaveText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
