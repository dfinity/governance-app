import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';
import { DeviceActionLabeledDetail } from '@features/ledger/components/DeviceActionDetail';

import { DeviceActionCancelledError, isDeviceActionCancelled } from '@hooks/useDeviceAction';
import { mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';
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

  return useMutation({
    mutationFn: ({ principal, accountId }: VerifyLedgerDeviceParams) =>
      runApprovedDeviceCall(
        principal,
        async (signal) => {
          const identity = await getLedgerIdentity(principal);
          // A cancel during the device connection must not ask for a confirmation.
          if (signal.aborted) throw new DeviceActionCancelledError();
          await identity.showAddressAndPubKeyOnDevice();
        },
        {
          description: t(($) => $.userAccount.ledgerDevices.verifyDescription),
          // The device shows the address first, then the principal.
          detail: (
            <DeviceActionLabeledDetail
              entries={[
                {
                  label: t(($) => $.userAccount.ledgerDevices.addDialog.accountIdentifier),
                  value: accountId,
                },
                {
                  label: t(($) => $.userAccount.ledgerDevices.addDialog.principal),
                  value: principal,
                },
              ]}
            />
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
