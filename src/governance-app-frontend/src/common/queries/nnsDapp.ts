import type { QueryClient } from '@tanstack/react-query';

import type { AccountDetails } from '@declarations/nns-dapp/nns-dapp.did';

import { QUERY_KEYS } from '@utils/query';
import { getNnsDappActor } from '@common/canisters';

import { CertifiedQuery, certifiedQueryKey, withCertifiedFlag } from './certified';

const getAccount = async (certified: boolean): Promise<AccountDetails | null> => {
  const actor = await getNnsDappActor({ certified });
  const response = await actor.get_account();

  return 'Ok' in response ? response.Ok : null;
};

export const nnsDappAccountQuery = (): CertifiedQuery<AccountDetails | null> => ({
  queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT],
  queryFn: () => getAccount(false),
  updateFn: () => getAccount(true),
});

/**
 * Resolves with the principals of the Ledger devices registered in NNS dapp, from the certified
 * cache or a certified call. It does not depend on the `ledgerDevice` feature or on WebHID.
 */
export const fetchRegisteredDevicePrincipals = async (
  queryClient: QueryClient,
): Promise<string[]> => {
  const { queryKey, updateFn } = nnsDappAccountQuery();
  const { response } = await queryClient.ensureQueryData({
    queryKey: certifiedQueryKey(queryKey),
    queryFn: () => withCertifiedFlag(updateFn(), true),
  });

  return (response?.hardware_wallet_accounts ?? []).map((device) => device.principal.toText());
};
