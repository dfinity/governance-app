import type { AddressBook } from '@declarations/governance-app-backend/backend.did';

import { errorMessage } from '@utils/error';
import { QUERY_KEYS } from '@utils/query';
import { getGovernanceAppActor } from '@common/canisters';

import { CertifiedQuery } from './certified';

const getAddressBook = async (certified: boolean): Promise<AddressBook> => {
  const actor = await getGovernanceAppActor({ certified });
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

export const addressBookQuery = (principal: string | undefined): CertifiedQuery<AddressBook> => ({
  queryKey: [QUERY_KEYS.GOVERNANCE_APP_BACKEND.ADDRESS_BOOK, principal],
  queryFn: () => getAddressBook(false),
  updateFn: () => getAddressBook(true),
});
