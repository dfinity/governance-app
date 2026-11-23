import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useGovernanceAppCanister } from '@hooks/addressBook/useGovernanceAppCanister';
import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { addressBookQuery } from '@common/queries/addressBook';
import { type CertifiedQuery, nonCertifiedQueryKey } from '@common/queries/certified';
import { nnsDappAccountQuery } from '@common/queries/nnsDapp';

/**
 * Reads the data one time for each `readId`, with a query call that is not certified. The key of
 * the read keeps it apart from the cache and from a request that started before it, because
 * those can miss a name that the user changed in another tab.
 */
const useFreshData = <TData>(
  { queryKey, queryFn }: CertifiedQuery<TData>,
  enabled: boolean,
  readId: string,
): TData | undefined => {
  const query = useQuery({
    queryKey: [...nonCertifiedQueryKey(queryKey), 'fresh', readId],
    queryFn: () => queryFn(),
    enabled,
    staleTime: Infinity,
    gcTime: 0,
  });

  return query.isSuccess ? query.data : undefined;
};

/**
 * Returns the names that the user gave: the address book names, the sub-account names, and the
 * Ledger device account names. Analytics must not receive these names.
 * Returns `undefined` until both sources load again after the palette opens.
 *
 * @param open Each open reads the names again. The palette can open again before its close
 * animation ends, and then the component stays mounted.
 */
export const usePrivateNames = (open: boolean): string[] | undefined => {
  const [mountId] = useState(() => crypto.randomUUID());
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenCount(openCount + 1);
  }
  const readId = `${mountId}-${openCount}`;

  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  const governanceApp = useGovernanceAppCanister();
  const nnsDapp = useNnsDapp();

  const addressBook = useFreshData(
    addressBookQuery(principal),
    governanceApp.ready && governanceApp.authenticated,
    readId,
  );
  // Not the account metadata hooks: they return no names when the feature is off.
  const nnsDappAccount = useFreshData(
    nnsDappAccountQuery(),
    nnsDapp.ready && nnsDapp.authenticated,
    readId,
  );
  if (addressBook === undefined || nnsDappAccount === undefined) return undefined;

  // `null` when the user has no NNS dapp account.
  return [
    ...addressBook.named_addresses.map(({ name }) => name),
    ...(nnsDappAccount?.sub_accounts ?? []).map(({ name }) => name),
    ...(nnsDappAccount?.hardware_wallet_accounts ?? []).map(({ name }) => name),
  ];
};
