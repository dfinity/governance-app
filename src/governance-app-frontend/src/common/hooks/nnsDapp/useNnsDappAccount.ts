import { useQueryThenUpdateCall } from '@hooks/useQueryThenUpdateCall';
import { nnsDappAccountQuery } from '@common/queries/nnsDapp';

import { useNnsDapp } from './useNnsDapp';

export const useNnsDappAccount = (enabled = true) => {
  const { ready, authenticated } = useNnsDapp();

  return useQueryThenUpdateCall({
    ...nnsDappAccountQuery(),
    options: {
      enabled: enabled && ready && authenticated,
    },
  });
};
