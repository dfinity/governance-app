import { Link, useRouter } from '@tanstack/react-router';
import classNames from 'classnames';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ToggleThemeButton } from '@components/buttons/toggleTheme/ToggleThemeButton';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';

import styles from './mainLayout.module.css';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();

  const { anonymous, authenticated } = useAgentPool().agentPool;
  const { login, identity, clear, isInitializing } = useInternetIdentity();
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;

  // TODO: identity does not refresh when it auto-expires.
  // Check this again when useInternetIdentity is updated.
  // Kristofer will update the library in the next weeks.
  const { invalidate } = useRouter();
  useEffect(() => {
    invalidate();
  }, [identity, invalidate]);

  return (
    <main
      data-testid="main-layout"
      className="m-auto flex h-[100vh] max-w-[1920px] flex-col justify-between gap-2 bg-primary p-4"
    >
      {showLoader ? (
        <SkeletonLoader count={6} />
      ) : (
        <>
          <title>{t(($) => $.home.title)}</title>
          <div>
            <div className="flex shrink-0 items-start justify-between gap-2">
              <Link to="/">
                <h1 className="pb-4 text-4xl font-bold text-brand-primary">
                  {t(($) => $.home.title)}
                </h1>
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
                  onClick={identity ? clear : login}
                  data-testid="login-btn"
                  className={classNames(
                    'rounded bg-blue-500 px-4 py-2 text-nowrap text-white hover:bg-blue-600',
                    {
                      'bg-red-500 hover:bg-red-600': identity,
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
          <div className="flex flex-col items-center gap-2 pt-4 text-xs">
            <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
          </div>
        </>
      )}
    </main>
  );
};
