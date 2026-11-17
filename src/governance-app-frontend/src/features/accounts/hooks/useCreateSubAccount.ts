import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { mapSubAccountError } from '@utils/errors/nnsDapp';
import { CanisterResponseError, getResponseVariant } from '@utils/errors/response';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

export function useCreateSubAccount() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsDapp();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!canister) throw new Error(t(($) => $.accounts.createSubAccount.error));

      // Ensure the principal is registered in the NNS dapp canister.
      // add_account is idempotent — returns the existing identifier if already registered.
      await canister.certifiedService.add_account();
      const response = await canister.certifiedService.create_sub_account(name);

      if (!('Ok' in response))
        throw new CanisterResponseError(
          mapSubAccountError(
            response,
            t(($) => $.accounts.createSubAccount.error),
          ),
          getResponseVariant(response),
        );

      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT] })
        .catch(failedRefresh);

      return response.Ok;
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.AccountCreateSubaccount);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.AccountCreateSubaccountError, {
        reason: getErrorReason(error),
      });
    },
  });
}
