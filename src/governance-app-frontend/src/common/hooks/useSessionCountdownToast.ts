import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useSessionTimeLeft } from '@hooks/useSessionTimeLeft';
import { getSessionTimeLeftForUi } from '@utils/date';

const SESSION_TOAST_ID = 'session-countdown';

export const useSessionCountdownToast = () => {
  const { t } = useTranslation();
  const timeLeft = useSessionTimeLeft();
  const isDismissedByUser = useRef(false);

  useEffect(() => {
    // Wait for session data to load
    if (!timeLeft) return;

    // Only show when less than 5 minutes remaining
    if (timeLeft.minutes >= 5) return;

    // Session expired
    if (timeLeft.minutes <= 0 && timeLeft.seconds <= 0) {
      toast.dismiss(SESSION_TOAST_ID);
      return;
    }

    if (isDismissedByUser.current) return;

    toast.warning(
      t(($) => $.userAccount.session.timeLeft, getSessionTimeLeftForUi(timeLeft)),
      {
        id: SESSION_TOAST_ID,
        duration: Infinity,
        closeButton: true,
        onDismiss: () => {
          isDismissedByUser.current = true;
        },
      },
    );
  }, [timeLeft, t]);

  useEffect(() => {
    return () => {
      toast.dismiss(SESSION_TOAST_ID);
    };
  }, []);
};
