import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ExternalLink, LaptopMinimalCheck, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { login, identity } = useInternetIdentity();
  const { t } = useTranslation();

  if (identity) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center space-y-8 rounded-2xl border border-border/40 bg-card/30 p-8 text-center text-foreground shadow-2xl backdrop-blur-xl sm:p-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <LaptopMinimalCheck className="h-10 w-10 text-primary" />
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
          >
            <LogIn className="mr-2 h-5 w-5" />
            {t(($) => $.common.loginWithII)}
          </Button>

          <a
            href="https://nns.ic0.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{t(($) => $.common.legacyNnsDapp)}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
