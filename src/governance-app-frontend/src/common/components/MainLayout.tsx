import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { BottomNav } from '@components/navigation/BottomNav';
import { Header } from '@components/navigation/Header';
import { Sidebar } from '@components/navigation/Sidebar';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useAgentPool } from '@hooks/useAgentPool';
import { infoNotification } from '@utils/notification';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const { identity, isInitializing } = useInternetIdentity();
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
    <div className="flex min-h-screen w-full bg-background" data-testid="main-layout">
      {showLoader ? (
        <div className="h-full w-full p-4">
          <SkeletonLoader count={6} />
        </div>
      ) : (
        <>
          <Sidebar />
          <div className="flex h-screen w-full flex-col overflow-hidden">
            <Header />
            <main className="relative mb-16 flex-1 overflow-auto p-6 lg:mb-0">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
            <BottomNav />
          </div>
        </>
      )}
    </div>
  );
};
