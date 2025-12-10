import { useQueryThenUpdateCall } from '@queries/useQueryThenUpdateCall';

import { QUERY_KEYS } from '@utils/query';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerMetadata = () => {
  const { ready, canister } = useIcpLedger();

  return useQueryThenUpdateCall({
    queryKey: [QUERY_KEYS.ICP_LEDGER.METADATA],
    queryFn: () =>
      canister!.metadata({
        certified: false,
      }),
    updateFn: () =>
      canister!.metadata({
        certified: true,
      }),
    options: { enabled: ready },
  });
};
