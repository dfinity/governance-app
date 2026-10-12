import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { mapSubAccountError } from '@utils/errors/nnsDapp';
import { CanisterResponseError, getResponseVariant } from '@utils/errors/response';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

export function useRenameSubAccount() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsDapp();

  return useMutation({
    mutationFn: async ({ accountId, newName }: { accountId: string; newName: string }) => {
      if (!canister) throw new Error(t(($) => $.accounts.renameSubAccount.error));

      const response = await canister.certifiedService.rename_sub_account({
        account_identifier: accountId,
        new_name: newName,
      });

      if (!('Ok' in response))
        throw new CanisterResponseError(
          mapSubAccountError(
            response,
            t(($) => $.accounts.renameSubAccount.error),
          ),
          getResponseVariant(response),
        );

      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT] })
        .catch(failedRefresh);
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.AccountRenameSubaccount);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.AccountRenameSubaccountError, {
        reason: getErrorReason(error),
      });
    },
  });
}
