import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Link } from '@untitledui/components';

import { ToggleThemeButton } from '@components/buttons/toggleTheme/ToggleThemeButton';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { login, identity, clear, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { invalidate } = useRouter();

  const { t } = useTranslation();
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;

  // BE CAREFUL CHANGING THIS EFFECT!
  // Run on identity change: login, logout, but also auto-expiration.
  const hadIdentity = useRef(!!identity);
  useEffect(() => {
    // Revalidate route guards.
    invalidate();

    // Logout or expiration change (single trigger).
    if (hadIdentity.current && !identity) {
      // Allow an async cycle for the authenticated agent to be removed.
      setTimeout(() => queryClient.resetQueries(), 0);
    }

    // Remember last identity state.
    hadIdentity.current = !!identity;
  }, [identity, invalidate, queryClient]);

  return (
    <main
      data-testid="main-layout"
      className="m-auto flex min-h-[100vh] max-w-[1920px] min-w-[385px] flex-col justify-between gap-2 overflow-auto p-4"
    >
      {showLoader ? (
        <SkeletonLoader count={6} />
      ) : (
        <>
          <title>{t(($) => $.home.title)}</title>
          <div>
            <div className="mb-10 flex flex-wrap items-start justify-center gap-2 sm:mb-0 sm:flex-nowrap sm:justify-between">
              <Link to="/">
                <h1 className="pb-4 text-4xl font-bold text-brand-primary">
                  {t(($) => $.home.title)}
                </h1>
              </Link>
              <div className="flex flex-wrap justify-center gap-4 sm:flex-nowrap">
                <Button to="/nns">{t(($) => $.common.nns)}</Button>
                <Button to="/sns">{t(($) => $.common.sns)}</Button>
                <Button to="/vault/$name" params={{ name: 'John' }} search={{ surname: 'Doe' }}>
                  {t(($) => $.common.vault)}
                </Button>

                <Button
                  data-testid="login-btn"
                  color={identity ? 'secondary-destructive' : 'secondary'}
                  onClick={identity ? clear : login}
                >
                  {identity ? t(($) => $.common.logout) : t(($) => $.common.login)}
                </Button>

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
