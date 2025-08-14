import { useTheme } from '@common/hooks/useTheme';

import { useIcpLedgerTotalSupply } from '@/common/hooks/canisters/icpLedger/useIcpLedgerTotalSupply';

function Homepage() {
  const { theme, toggleTheme } = useTheme();

  const { isReady, totalSupplyQuery } = useIcpLedgerTotalSupply();

  return (
    <main className="p-4">
      <div>
        <h1 className="text-4xl font-bold">The Governance App</h1>
        <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
        <button
          onClick={login}
          disabled={identity !== undefined}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Login with Internet Identity!
        </button>
      </div>

      {
        <>
          <div className="pt-4">
            Total supply: {isReady ? 'Ready' : 'Not ready'}
            {totalSupplyQuery.isLoading && <p>Loading...</p>}
            {totalSupplyQuery.isError && <p>Error: {totalSupplyQuery.error.message}</p>}
            {Boolean(totalSupplyQuery.data) && <p>{totalSupplyQuery.data?.toString()}</p>}
          </div>

          <div className="text-2xl pt-4">
            Hello world! You are:{' '}
            <span className="underline italic text-purple-500">
              {identity?.getPrincipal().toString()}
            </span>
          </div>
        </>
      }

      <div className="text-xs pt-4 flex items-center gap-2">
        You are using the theme: {theme}
        <button
          className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600 uppercase font-bold"
          onClick={toggleTheme}
        >
          Toggle theme
        </button>
      </div>
    </main>
  );
}

export default Homepage;
