import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { isDeviceActionCancelled } from '@hooks/useDeviceAction';
import { mapCanisterError } from '@utils/errors';
import { errorNotification } from '@utils/notification';
import { connectLedgerIdentity } from '@common/ledger/session';

/**
 * Connects to the Ledger device the user picks. A failure shows a toast, except a cancel
 * through the `AbortSignal` (the add dialog closed).
 */
export function useConnectLedgerDevice() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (signal?: AbortSignal) => connectLedgerIdentity(signal),
    onSuccess: () => {
      analytics.event(AnalyticsEvent.LedgerDeviceConnect);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.LedgerDeviceConnectError, { reason: getErrorReason(error) });
      if (isDeviceActionCancelled(error)) return;

      errorNotification({
        title: t(($) => $.accounts.ledgerDevice),
        description: mapCanisterError(error),
      });
    },
  });
}
