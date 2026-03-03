import type { ActorSubclass } from '@icp-sdk/core/agent';
import { useInternetIdentity } from 'ic-use-internet-identity';

import type {
  _SERVICE,
  AddressBook,
} from '@declarations/governance-app-backend/governance-app-backend.did';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { errorMessage } from '@utils/error';
import { QUERY_KEYS } from '@utils/query';

import { useGovernanceAppBackend } from './useGovernanceAppBackend';

const unwrapResponse = async (actor: ActorSubclass<_SERVICE>): Promise<AddressBook> => {
  const response = await actor.get_address_book();
  if ('Ok' in response) {
    return {
      ...response.Ok,
      named_addresses: [...response.Ok.named_addresses].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    };
  }
  throw errorMessage('useAddressBook', 'failed to get address book');
};

export const useAddressBook = () => {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  const { ready, authenticated, canister } = useGovernanceAppBackend();

  return useQueryThenUpdateCall<AddressBook>({
    queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.ADDRESS_BOOK, principal],
    queryFn: () => unwrapResponse(canister!.service),
    updateFn: () => unwrapResponse(canister!.certifiedService),
    options: {
      enabled: ready && authenticated,
    },
  });
};
