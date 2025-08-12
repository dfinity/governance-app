import { useInternetIdentity } from 'ic-use-internet-identity';

import { useTheme } from '../../common/hooks/useTheme';
import { useQueryUpdateCall } from '../../common/queries/useQueryUpdateCall';

function Homepage() {
  const { login, identity } = useInternetIdentity();
  const { theme, toggleTheme } = useTheme();

  const data = useQueryUpdateCall<{
    message: string;
  }>({
    key: ['test'],
    queryFn: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ message: 'Hello from the server!' });
        }, 1000);
      }),
    updateFn: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ message: 'Hello from the server! CERTIFIED' });
        }, 4000);
      }),
    options: {
      enabled: identity !== undefined,
    },
  });

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

      {identity !== undefined && (
        <>
          <div className="pt-4">
            {data.isLoading && <p>Loading...</p>}
            {data.isError && <p>Error: {data.error.message}</p>}
            {data.data && <p>{data.data.data.message}</p>}
          </div>

          <div className="text-2xl pt-4">
            Hello world! You are:{' '}
            <span className="underline italic text-purple-500">
              {identity?.getPrincipal().toString()}
            </span>
          </div>
        </>
      )}

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
