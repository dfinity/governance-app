import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ToggleThemeButton } from '@components/buttons/toggleTheme/ToggleThemeButton';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';

import styles from './mainLayout.module.css';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const { login, identity, clear, isInitializing } = useInternetIdentity();
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;

  const { t } = useTranslation();

  return (
    <main className="p-4 flex justify-between flex-col gap-2 h-[100vh] max-w-[1920px] m-auto">
      {showLoader ? (
        <SkeletonLoader count={3} height={100} />
      ) : (
        <>
          <title>{t(($) => $.home.title)}</title>
          <div>
            <div className="flex items-start justify-between shrink-0 gap-2">
              <Link to="/">
                <h1 className="text-4xl font-bold pb-4">{t(($) => $.home.title)}</h1>
              </Link>
              <div className="flex gap-4">
                <Link to="/nns" className={styles.link}>
                  {t(($) => $.common.nns)}
                </Link>
                <Link to="/sns" className={styles.link}>
                  {t(($) => $.common.sns)}
                </Link>
                <Link
                  to="/vault/$name"
                  params={{ name: 'John' }}
                  search={{ surname: 'Doe' }}
                  className={styles.link}
                >
                  {t(($) => $.common.vault)}
                </Link>

                <button
                  onClick={
                    identity
                      ? () => {
                          clear();
                          window.location.reload();
                        }
                      : login
                  }
                  className={classNames(
                    'text-nowrap rounded px-4 py-2 text-white hover:bg-blue-600 bg-blue-500',
                    {
                      'hover:bg-red-600 bg-red-500': identity,
                    },
                  )}
                >
                  {identity ? 'Logout' : 'Login with Internet Identity!'}
                </button>

                <ToggleThemeButton />
              </div>
            </div>
            {children}
          </div>
          <div className="text-xs pt-4 flex items-center gap-2 flex-col">
            <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
          </div>
        </>
      )}
    </main>
  );
};
