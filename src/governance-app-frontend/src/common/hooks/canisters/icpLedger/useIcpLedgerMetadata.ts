import { QUERY_KEYS } from '@common/utils/queryKeys';
import { useQueryThenUpdateCall } from '@common/queries/useQueryThenUpdateCall';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerMetadata = () => {
  const { ready, canister } = useIcpLedger();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.ICP_LEDGER.METADATA],
    queryFn: () =>
      canister!
        .metadata({
          certified: false,
        })
        .then((res) => String(res)),
    updateFn: () =>
      canister!
        .metadata({
          certified: true,
        })
        .then((res) => String(res)),
    options: { enabled: ready },
  });
};
