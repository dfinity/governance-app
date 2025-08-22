import classNames from 'classnames';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode } from 'react';

import { useAgentPool } from '@common/hooks/useAgentPool';
import { useTheme } from '@common/hooks/useTheme';

export const Layout = ({ children }: { children: ReactNode }) => {
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const isLoadingAgents = anonymous.loading || authenticated.loading;
  const { login, identity, clear } = useInternetIdentity();
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="p-4 flex justify-between flex-col gap-2 h-[100vh]">
      <div>
        <div className="flex items-start justify-between">
          <h1 className="text-4xl font-bold pb-4">The Governance App</h1>
          <div className="flex gap-2">
            <button
              onClick={identity ? clear : login}
              className={classNames('rounded px-4 py-2 text-white hover:bg-blue-600 bg-blue-500', {
                'hover:bg-red-600 bg-red-500': identity,
              })}
            >
              {identity ? 'Logout' : 'Login with Internet Identity!'}
            </button>
          </div>
        </div>
        {isLoadingAgents ? <p>Loading agents...</p> : children}
      </div>
      <div className="text-xs pt-4 flex items-center gap-2 flex-col">
        <div className="flex gap-2 items-center">
          You are using the theme: {theme}
          <button
            className="rounded bg-gray-500 px-1 py-0.75 text-white hover:bg-gray-600 uppercase font-bold"
            onClick={toggleTheme}
          >
            Toggle theme
          </button>
        </div>
        <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
      </div>
    </main>
  );
};
