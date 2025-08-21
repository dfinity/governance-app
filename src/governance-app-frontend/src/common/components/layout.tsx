import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode } from 'react';

import { Theme } from '@common/contexts/themeContext';
import { useAgentPool } from '@common/hooks/useAgentPool';
import { useTheme } from '@common/hooks/useTheme';

import styles from './layout.module.css';

export const Layout = ({ children }: { children: ReactNode }) => {
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const isLoadingAgents = anonymous.loading || authenticated.loading;
  const { login, identity, clear } = useInternetIdentity();
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="p-4 flex justify-between flex-col gap-2 h-[100vh] max-w-[1920px] m-auto">
      <div>
        <div className="flex items-start justify-between shrink-0">
          <Link to="/">
            <h1 className="text-4xl font-bold pb-4">The Governance App</h1>
          </Link>
          <div className="flex gap-5">
            <Link to="/nns" className={styles.link}>
              NNS
            </Link>
            <Link to="/sns" className={styles.link}>
              SNS
            </Link>
            <Link to="/vault" className={styles.link}>
              VAULT
            </Link>

            <button
              onClick={identity ? clear : login}
              className={classNames(
                'text-nowrap rounded px-4 py-2 text-white hover:bg-blue-600 bg-blue-500',
                {
                  'hover:bg-red-600 bg-red-500': identity,
                },
              )}
            >
              {identity ? 'Logout' : 'Login with Internet Identity!'}
            </button>

            <span onClick={toggleTheme} className={classNames(styles.link, styles.theme)}>
              {theme === Theme.Dark ? '☀️' : '🌙'}
            </span>
          </div>
        </div>

        {isLoadingAgents ? <p>Initializing HTTP agents...</p> : children}
      </div>

      <div className="text-xs pt-4 flex items-center gap-2 flex-col">
        <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
      </div>
    </main>
  );
};
