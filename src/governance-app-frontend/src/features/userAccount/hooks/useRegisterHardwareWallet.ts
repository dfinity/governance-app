import type { Principal } from '@icp-sdk/core/principal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { mapRegisterHardwareWalletError } from '@utils/errors/nnsDapp';
import { CanisterResponseError, getResponseVariant } from '@utils/errors/response';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

type RegisterHardwareWalletParams = {
  name: string;
  principal: Principal;
};

/** Registers a Ledger device in the NNS dapp account of the Internet Identity principal. */
export function useRegisterHardwareWallet() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsDapp();

  return useMutation({
    mutationFn: async ({ name, principal }: RegisterHardwareWalletParams) => {
      const fallback = t(($) => $.userAccount.ledgerDevices.addDialog.error);
      if (!canister) throw new Error(fallback);

      // add_account is idempotent. It makes sure the principal has an NNS dapp account.
      await canister.certifiedService.add_account();
      const response = await canister.certifiedService.register_hardware_wallet({
        name,
        principal,
      });

      if (!('Ok' in response))
        throw new CanisterResponseError(
          mapRegisterHardwareWalletError(response, fallback),
          getResponseVariant(response),
        );

      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT] })
        .catch(failedRefresh);
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.LedgerDeviceRegister);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.LedgerDeviceRegisterError, {
        reason: getErrorReason(error),
      });
    },
  });
}
