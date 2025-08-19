import { useQueryThenCertifyCall } from '@common/queries/useQueryThenCertifyCall';
import { QUERY_KEYS } from '@common/utils/queryKeys';

import { useIcpLedger } from './useIcpLedger';

export const useIcpLedgerMetadata = () => {
  const { ready, canister } = useIcpLedger();

  return useQueryThenCertifyCall({
    queryKey: [QUERY_KEYS.ICP_LEDGER.METADATA],
    uncertifiedFn: () =>
      canister!
        .metadata({
          certified: false,
        })
        .then((res) => String(res)),
    certifiedFn: () =>
      canister!
        .metadata({
          certified: true,
        })
        .then((res) => String(res)),
    options: { enabled: ready },
  });
};
