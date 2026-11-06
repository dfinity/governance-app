import type { AccountDetails } from '@declarations/nns-dapp/nns-dapp.did';

import { QUERY_KEYS } from '@utils/query';
import { getNnsDappActor } from '@common/canisters';

import { CertifiedQuery } from './certified';

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
