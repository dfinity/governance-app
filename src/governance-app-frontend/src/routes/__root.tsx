import { nonNullish } from '@dfinity/utils';
import { useQueryClient } from '@tanstack/react-query';
import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { MainLayout } from '@components/MainLayout';
import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { useSessionCountdownToast } from '@hooks/useSessionCountdownToast';
import { useThemeShortcut } from '@hooks/useThemeShortcut';
import { infoNotification } from '@utils/notification';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: RootNotFound,
});

function RootNotFound() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = nonNullish(identity);

  if (isAuthenticated) return <AuthenticatedNotFound />;

  return <UnauthenticatedNotFound />;
}

function AuthenticatedNotFound() {
  const { t } = useTranslation();

  useThemeShortcut();
  useSessionCountdownToast();

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <div className="flex max-w-md flex-col items-center text-center">
          <h1 className="text-8xl leading-none font-bold tracking-tighter text-muted-foreground/20 sm:text-9xl">
            404
          </h1>
          <div className="-mt-4 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t(($) => $.common.notFound.title)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(($) => $.common.notFound.description)}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="size-4" />
              {t(($) => $.common.notFound.goBack)}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function UnauthenticatedNotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-[10rem] leading-none font-bold tracking-tighter text-muted-foreground/20 sm:text-[12rem]">
          404
        </h1>
        <div className="-mt-8 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t(($) => $.common.notFound.title)}
          </h2>
          <p className="text-muted-foreground">{t(($) => $.common.notFound.description)}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="default" size="lg">
            <Link to="/">
              <LogIn className="size-4" />
              {t(($) => $.common.notFound.goToLogin)}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  const { identity } = useInternetIdentity();
  const { invalidate } = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const hadIdentity = useRef(!!identity);

  // Global identity change handler: login, logout, and auto-expiration
  useEffect(() => {
    // Revalidate/re-check route guards on any identity change
    invalidate().finally(() => {
      // Handle logout or session expiration
      if (hadIdentity.current && !identity) {
        // Reset queries after identity is removed
        queryClient.resetQueries();

        // Check if this was a manual logout or auto-expiration
        const isManualLogout = localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';
        localStorage.removeItem(MANUAL_LOGOUT_KEY);

        if (isManualLogout) return;

        // Notify user only on auto-expiration
        infoNotification({ description: t(($) => $.common.autoExpirationLogout) });
      }

      // Remember last identity state.
      hadIdentity.current = !!identity;
    });
  }, [identity, invalidate, queryClient, t]);

  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}
