import { nonNullish } from '@dfinity/utils';
import { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Button } from '@components/button';
import { MainLayout } from '@components/MainLayout';
import { SessionCountdownToast } from '@components/SessionCountdownToast';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { useSessionChange } from '@hooks/useSessionChange';
import { useThemeShortcut } from '@hooks/useThemeShortcut';
import { isE2E } from '@utils/e2e';

import i18n from '@/i18n/config';

export type RouterContext = {
  /** Lets route loaders warm queries before the route's component mounts. */
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => {
    const appName = i18n.t(($) => $.common.head.appName);
    const description = i18n.t(($) => $.common.head.defaultDescription);

    return {
      meta: [
        { title: appName },
        { name: 'description', content: description },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: appName },
        { property: 'og:title', content: appName },
        { property: 'og:description', content: description },
        // Twitter Card
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: appName },
        { name: 'twitter:description', content: description },
      ],
    };
  },
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

  useEffect(() => {
    analytics.init();
    analytics.event(AnalyticsEvent.NotFound, undefined, { interactive: false });
  }, []);

  return (
    <MainLayout>
      <SessionCountdownToast />
      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <div className="flex max-w-md flex-col items-center text-center">
          <h1 className="text-8xl leading-none font-bold tracking-tighter text-muted-foreground/20 sm:text-9xl">
            404
          </h1>
          <div className="-mt-4 space-y-2">
            <h2 className="text-2xl font-normal tracking-tight sm:text-3xl">
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
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <div className="px-4 py-10 sm:p-12">
        <div className="relative w-fit">
          <img
            src="/infinity-mark.png"
            alt={t(($) => $.common.alt.icpLogo)}
            className="h-6 w-auto"
          />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center text-center">
          <h1 className="text-[10rem] leading-none font-bold tracking-tighter text-muted-foreground/20 sm:text-[12rem]">
            404
          </h1>
          <div className="-mt-8 space-y-3">
            <h2 className="text-3xl font-normal tracking-tight sm:text-4xl">
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
    </div>
  );
}

function RootComponent() {
  useSessionChange();

  return (
    <>
      <HeadContent />
      <Outlet />
      <Scripts />
      {!isE2E && <TanStackRouterDevtools />}
    </>
  );
}
