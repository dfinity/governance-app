import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { isDeviceActionCancelled, useDeviceAction } from '@hooks/useDeviceAction';
import { mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { runOnDevice } from '@common/ledger/deviceQueue';
import { getLedgerIdentity } from '@common/ledger/session';

type VerifyLedgerDeviceParams = {
  principal: string;
  accountId: string;
};

/**
 * Shows the principal and the address of a registered device on its screen.
 * The approval dialog shows the expected values and stays open until the user confirms on
 * the device.
 */
export function useVerifyLedgerDevice() {
  const { t } = useTranslation();
  const runDeviceAction = useDeviceAction();

  return useMutation({
    mutationFn: ({ principal, accountId }: VerifyLedgerDeviceParams) =>
      runDeviceAction(
        (signal) =>
          runOnDevice(principal, async () => {
            // A cancelled call that waited in the queue must not prompt the device.
            if (signal.aborted) return;
            const identity = await getLedgerIdentity(principal);
            if (signal.aborted) return;
            await identity.showAddressAndPubKeyOnDevice();
          }),
        {
          description: t(($) => $.userAccount.ledgerDevices.verifyDescription),
          detail: (
            <span className="flex flex-col gap-1">
              <span>{principal}</span>
              <span>{accountId}</span>
            </span>
          ),
        },
      ),
    onSuccess: () => {
      analytics.event(AnalyticsEvent.LedgerDeviceVerify);
      successNotification({
        title: t(($) => $.accounts.ledgerDevice),
        description: t(($) => $.userAccount.ledgerDevices.verified),
      });
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.LedgerDeviceVerifyError, { reason: getErrorReason(error) });
      if (isDeviceActionCancelled(error)) return;

      errorNotification({
        title: t(($) => $.accounts.ledgerDevice),
        description: mapCanisterError(error),
      });
    },
  });
}
