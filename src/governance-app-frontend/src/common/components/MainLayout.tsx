import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { ModeToggle } from '@components/mode-toggle';
import { useAgentPool } from '@hooks/useAgentPool';
import { infoNotification } from '@utils/notification';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { login, identity, clear, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { invalidate } = useRouter();

  const { t } = useTranslation();
  const { anonymous, authenticated } = useAgentPool().agentPool;
  const showLoader = anonymous.loading || authenticated.loading || isInitializing;

  // BE CAREFUL CHANGING THIS EFFECT!

  // Track manual logout, to distinguish from expiration, and show a notification.
  const wasManualLogout = useRef(false);
  // Remember if we had an identity, to trigger a single change.
  const hadIdentity = useRef(!!identity);
  // Run on identity change: login, logout, but also auto-expiration.
  useEffect(() => {
    // Revalidate/re-check route guards in all cases.
    invalidate();

    // Logout or expiration change (single trigger).
    if (hadIdentity.current && !identity) {
      // Allow an async cycle for the authenticated agent to be removed before refreshing the queries.
      setTimeout(() => queryClient.resetQueries(), 0);

      // Show notification in case of expiration only.
      if (!wasManualLogout.current) {
        infoNotification({ description: t(($) => $.common.autoExpirationLogout) });
      }
    }

    // Reset manual logout tracking.
    wasManualLogout.current = false;
    // Remember last identity state.
    hadIdentity.current = !!identity;
  }, [identity, invalidate, queryClient, t]);

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
                <h1 className="text-brand-primary pb-4 text-4xl font-bold">
                  {t(($) => $.home.title)}
                </h1>
              </Link>
              <div className="flex flex-wrap justify-center gap-4 sm:flex-nowrap">
                <Button asChild>
                  <Link to="/nns">{t(($) => $.common.nns)}</Link>
                </Button>
                <Button
                  data-testid="login-btn"
                  variant={identity ? 'outline' : 'secondary'}
                  className={
                    identity
                      ? 'border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive'
                      : ''
                  }
                  onClick={
                    identity
                      ? () => {
                          wasManualLogout.current = true;
                          clear();
                        }
                      : login
                  }
                >
                  {identity ? t(($) => $.common.logout) : t(($) => $.common.login)}
                </Button>

                <ModeToggle />
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
