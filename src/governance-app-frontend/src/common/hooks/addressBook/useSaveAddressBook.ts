import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { AnalyticsEvent } from '@features/analytics/events';
import { getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { mapSetAddressBookError } from '@utils/errors/addressBook';
import { CanisterResponseError, getResponseVariant } from '@utils/errors/response';
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
        throw new CanisterResponseError(
          mapSetAddressBookError(response),
          getResponseVariant(response),
        );
      }

      await queryClient
        .invalidateQueries({
          queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.ADDRESS_BOOK],
        })
        .catch(failedRefresh);
    },
    onSuccess: () => {
      analytics.event(AnalyticsEvent.AddressBookSave);
    },
    onError: (error) => {
      analytics.event(AnalyticsEvent.AddressBookSaveError, { reason: getErrorReason(error) });
    },
  });
}
