import { useInternetIdentity } from 'ic-use-internet-identity';

function App() {
  const { login, status, error, isError, identity } = useInternetIdentity();

  return (
    <main>
      <h2>Governance dApp</h2>
      <img src="/logo2.svg" alt="DFINITY logo" />
      <button
        onClick={login}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Login with Internet Identity
      </button>
      <span>{identity?.getPrincipal().toString()}</span>
    </main>
  );
}

export default App;
