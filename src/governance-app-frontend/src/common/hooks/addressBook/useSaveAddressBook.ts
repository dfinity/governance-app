import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { mapSetAddressBookError } from '@utils/errors/addressBook';
import { failedRefresh, QUERY_KEYS } from '@utils/query';

import { useGovernanceAppCanister } from './useGovernanceAppCanister';

export function useSaveAddressBook() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { canister } = useGovernanceAppCanister();

  return useMutation({
    mutationFn: async (namedAddresses: NamedAddress[]) => {
      if (!canister || !identity) {
        throw new Error(t(($) => $.addressBook.toast.saveError));
      }

      const response = await canister.certifiedService.set_address_book({
        named_addresses: namedAddresses,
      });

      if (!('Ok' in response)) {
        throw new Error(mapSetAddressBookError(response));
      }

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.ADDRESS_BOOK],
        })
        .catch(failedRefresh);
    },
  });
}
