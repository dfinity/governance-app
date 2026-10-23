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

/**
 * Shows the principal and the address of a registered device on its screen.
 * The approval dialog stays open until the user confirms on the device.
 */
export function useVerifyLedgerDevice() {
  const { t } = useTranslation();
  const runDeviceAction = useDeviceAction();

  return useMutation({
    mutationFn: (principal: string) =>
      runDeviceAction(
        () =>
          runOnDevice(principal, async () => {
            const identity = await getLedgerIdentity(principal);
            await identity.showAddressAndPubKeyOnDevice();
          }),
        { description: t(($) => $.userAccount.ledgerDevices.verifyDescription) },
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
