import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ExternalLink, LogIn, Vote } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

type LoginSearch = {
  redirect?: string;
};

// Temporal Animation
// Lazy load the map to avoid blocking the main thread during initial render
const AnimatedDecentralizedMap = lazy(() =>
  import('@components/temporary-animation/AnimatedDecentralizedMap').then((module) => ({
    default: module.AnimatedDecentralizedMap,
  })),
);
// End of Temporal Animation

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { login, identity } = useInternetIdentity();
  const { t } = useTranslation();
  const { redirect = '/' } = Route.useSearch();

  if (identity) return <Navigate to={redirect} />;

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center p-4 py-8">
      {/* Temporal Animation*/}
      <div className="absolute inset-0 hidden h-full w-full overflow-hidden md:block">
        <Suspense fallback={null}>
          <AnimatedDecentralizedMap />
        </Suspense>
      </div>
      {/*End of Temporal Animation*/}

      <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center space-y-6 rounded-2xl border border-border bg-card/50 p-6 text-center text-foreground shadow-2xl backdrop-blur-xl sm:p-12 md:space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Vote className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t(($) => $.common.loginTitle)}
          </h1>
          <p className="text-muted-foreground">{t(($) => $.common.loginSubtitle)}</p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Button
            onClick={login}
            className="h-12 w-full text-base font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-primary/25"
            size="lg"
            data-testid="login-btn"
          >
            <LogIn className="hidden h-5 w-5 xs:block" />
            {t(($) => $.common.loginWithII)}
          </Button>

          <a
            href="https://nns.ic0.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            <ExternalLink className="size-4" />
            <span>{t(($) => $.common.legacyNnsDapp)}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
