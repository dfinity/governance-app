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
  description: string;
};

export function NavigationBlockerDialog({ isBlocked, description }: Props) {
  const { t } = useTranslation();

  const { status, proceed, reset } = useBlocker({
    shouldBlockFn: () => isBlocked,
    withResolver: true,
    enableBeforeUnload: isBlocked,
  });

  return (
    <AlertDialog open={status === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(($) => $.common.warning)}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={reset}>{t(($) => $.common.cancel)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={proceed}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {t(($) => $.common.leave)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
