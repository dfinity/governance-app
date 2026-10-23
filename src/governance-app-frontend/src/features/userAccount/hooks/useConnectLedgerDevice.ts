import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { mapCanisterError } from '@utils/errors';
import { errorNotification } from '@utils/notification';
import { connectLedgerIdentity } from '@common/ledger/session';

/** Connects to the Ledger device the user picks. A failure shows a toast. */
export function useConnectLedgerDevice() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: connectLedgerIdentity,
    onSuccess: () => {
      analytics.event(AnalyticsEvent.LedgerDeviceConnect);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.LedgerDeviceConnectError, { reason: getErrorReason(error) });
      errorNotification({
        title: t(($) => $.accounts.ledgerDevice),
        description: mapCanisterError(error),
      });
    },
  });
}
