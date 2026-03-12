import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { RenameSubAccountResponse } from '@declarations/nns-dapp/nns-dapp.did';

import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

export function useRenameSubAccount() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canister } = useNnsDapp();

  const mapError = (response: RenameSubAccountResponse): string => {
    if ('AccountNotFound' in response)
      return t(($) => $.accounts.renameSubAccount.errorAccountNotFound);
    if ('SubAccountNotFound' in response)
      return t(($) => $.accounts.renameSubAccount.errorSubAccountNotFound);
    if ('NameTooLong' in response) return t(($) => $.accounts.renameSubAccount.errorNameTooLong);
    return t(($) => $.accounts.renameSubAccount.error);
  };

  return useMutation({
    mutationFn: async ({ accountId, newName }: { accountId: string; newName: string }) => {
      if (!canister) throw new Error(t(($) => $.accounts.renameSubAccount.error));

      const response = await canister.certifiedService.rename_sub_account({
        account_identifier: accountId,
        new_name: newName,
      });

      if (!('Ok' in response)) throw new Error(mapError(response));

      await queryClient
        .invalidateQueries({ queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT] })
        .catch(failedRefresh);
    },
  });
}
