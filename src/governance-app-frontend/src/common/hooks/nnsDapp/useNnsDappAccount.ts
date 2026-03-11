import { AccountDetails, GetAccountResponse } from '@declarations/nns-dapp/nns-dapp.did';

import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { QUERY_KEYS } from '@utils/query';

import { useNnsDapp } from './useNnsDapp';

const unwrap = (response: GetAccountResponse): AccountDetails | null => {
  if ('Ok' in response) return response.Ok;
  return null;
};

export const useNnsDappAccount = () => {
  const { ready, authenticated, canister } = useNnsDapp();

  return useQueryThenUpdateCall<AccountDetails | null>({
    queryKey: [QUERY_KEYS.NNS_DAPP.ACCOUNT],
    queryFn: async () => unwrap(await canister!.service.get_account()),
    updateFn: async () => unwrap(await canister!.certifiedService.get_account()),
    options: {
      enabled: ready && authenticated,
    },
  });
};
