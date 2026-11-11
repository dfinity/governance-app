import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { addressBookQuery } from '@common/queries/addressBook';

import { useGovernanceAppCanister } from './useGovernanceAppCanister';

export const useAddressBook = () => {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  const { ready, authenticated } = useGovernanceAppCanister();

  return useQueryThenUpdateCall({
    ...addressBookQuery(principal),
    options: {
      enabled: ready && authenticated,
    },
  });
};
