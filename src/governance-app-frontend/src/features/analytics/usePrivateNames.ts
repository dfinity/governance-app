import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useGovernanceAppCanister } from '@hooks/addressBook/useGovernanceAppCanister';
import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { addressBookQuery } from '@common/queries/addressBook';
import { type CertifiedQuery, nonCertifiedQueryKey } from '@common/queries/certified';
import { nnsDappAccountQuery } from '@common/queries/nnsDapp';
import type { CertifiedData } from '@common/typings/queries';

/**
 * Reads the data again when the component mounts, with a query call that is not certified.
 * Returns the data only after a read since the mount succeeds, because the cache can miss a name
 * that the user changed in another tab. Shares the cache with `useQueryThenUpdateCall`.
 */
const useFreshData = <TData>(
  { queryKey, queryFn }: CertifiedQuery<TData>,
  enabled: boolean,
): TData | undefined => {
  const [mountedAt] = useState(() => Date.now());
  const query = useQuery({
    queryKey: nonCertifiedQueryKey(queryKey),
    queryFn: async (): Promise<CertifiedData<TData>> => ({
      response: await queryFn(),
      certified: false,
    }),
    enabled,
    staleTime: 0,
  });

  const fresh = query.isSuccess && !query.isFetching && query.dataUpdatedAt >= mountedAt;
  return fresh ? query.data.response : undefined;
};

/**
 * Returns the names that the user gave: the address book names, the sub-account names, and the
 * Ledger device account names. Analytics must not receive these names.
 * Returns `undefined` until both sources load again after the mount.
 */
export const usePrivateNames = (): string[] | undefined => {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  const governanceApp = useGovernanceAppCanister();
  const nnsDapp = useNnsDapp();

  const addressBook = useFreshData(
    addressBookQuery(principal),
    governanceApp.ready && governanceApp.authenticated,
  );
  // Not the account metadata hooks: they return no names when the feature is off.
  const nnsDappAccount = useFreshData(
    nnsDappAccountQuery(),
    nnsDapp.ready && nnsDapp.authenticated,
  );
  if (addressBook === undefined || nnsDappAccount === undefined) return undefined;

  // `null` when the user has no NNS dapp account.
  return [
    ...addressBook.named_addresses.map(({ name }) => name),
    ...(nnsDappAccount?.sub_accounts ?? []).map(({ name }) => name),
    ...(nnsDappAccount?.hardware_wallet_accounts ?? []).map(({ name }) => name),
  ];
};
