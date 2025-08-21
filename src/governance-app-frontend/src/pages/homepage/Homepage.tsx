import { useInternetIdentity } from 'ic-use-internet-identity';

import { useIcpLedgerMetadata } from '@common/hooks/canisters/icpLedger/useIcpLedgerMetadata';

function Homepage() {
  const { identity } = useInternetIdentity();
  const metadata = useIcpLedgerMetadata();

  return (
    <div>
      <div className="text-2xl pt-4">
        {identity ? (
          <>
            You are:{' '}
            <span className="underline italic text-purple-500">
              {identity?.getPrincipal().toString()}
            </span>
          </>
        ) : (
          'Please log in!'
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
