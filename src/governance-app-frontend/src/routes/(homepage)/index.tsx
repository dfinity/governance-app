import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { useIcpLedgerMetadata } from '@hooks/canisters/icpLedger/useIcpLedgerMetadata';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();
  const metadata = useIcpLedgerMetadata();
  const { t } = useTranslation();

  return (
    <div>
      <div className="text-2xl">
        {identity
          ? t(($) => $.home.yourPrincipal, {
              principal: identity?.getPrincipal().toString() ?? '',
            })
          : t(($) => $.common.login)}
      </div>

      <div className="pt-4">
        {metadata.isLoading && <p>{t(($) => $.common.loadingWithDots)}</p>}
        {metadata.isError && <p>{t(($) => $.common.error)}</p>}
        {metadata.data && (
          <p className="flex items-center gap-2 h-8">
            {metadata.data.data} {metadata.data.certified && <CertifiedBadge />}
          </p>
        )}
      </div>
    </div>
  );
}
