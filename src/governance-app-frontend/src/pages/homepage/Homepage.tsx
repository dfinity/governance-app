import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useIcpLedgerMetadata } from '@common/hooks/canisters/icpLedger/useIcpLedgerMetadata';

function Homepage() {
  const { identity } = useInternetIdentity();
  const metadata = useIcpLedgerMetadata();
  const { t } = useTranslation();

  return (
    <div>
      <div className="text-2xl pt-4">
        {identity ? (
          <>
            {t(($) => $.home.yourPrincipal, {
              principal: identity?.getPrincipal().toString() ?? '',
            })}
          </>
        ) : (
          <>{t(($) => $.common.login)}</>
        )}
      </div>
      <div className="pt-4">
        {metadata.isLoading && <p>Loading...</p>}
        {metadata.isError && <p>Error: {metadata.error.message}</p>}
        {metadata.data && (
          <p>
            {metadata.data.data}{' '}
            {metadata.data.certified && (
              <span className="text-green-500 font-bold uppercase">(certified)</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default Homepage;
