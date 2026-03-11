import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import type { CreateSubAccountResponse } from '@hooks/nnsDapp/nnsDapp.types';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

const mapError = (response: CreateSubAccountResponse): string => {
  if ('AccountNotFound' in response) return 'Account not found in NNS dapp';
  if ('SubAccountLimitExceeded' in response) return 'Sub-account limit exceeded';
  if ('NameTooLong' in response) return 'Name is too long';
  return 'Unknown error';
};

export function useCreateSubAccount() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsDapp();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!canister) {
        throw new Error(t(($) => $.accounts.createSubAccount.error));
      }

      // Ensure the principal is registered in the NNS dapp canister.
      // add_account is idempotent — returns the existing identifier if already registered.
      await canister.certifiedService.add_account();

      const response = await canister.certifiedService.create_sub_account(name);

      if (!('Ok' in response)) {
        throw new Error(mapError(response));
      }

      await Promise.all([
        queryClient
          .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT] })
          .catch(failedRefresh),
        queryClient
          .invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS.SUBACCOUNT_BALANCES] })
          .catch(failedRefresh),
        queryClient
          .invalidateQueries({ queryKey: [QUERY_KEYS.ACCOUNTS.RECENT_TRANSACTIONS] })
          .catch(failedRefresh),
      ]);

      return response.Ok;
    },
  });
}
