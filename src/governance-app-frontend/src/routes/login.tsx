import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Separator } from '@components/Separator';
import { formatNumber } from '@utils/numbers';

type LoginSearch = {
  redirect?: string;
};

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

  // @TODO: TO be replaced with real data
  const tvl = 812865900;
  const participants = 57986;
  const proposalsAdopted = 48;

  if (identity) return <Navigate to={redirect} />;

  return (
    <div className="dark relative flex min-h-dvh w-full flex-col justify-between overflow-hidden px-4 py-10 font-sans text-foreground sm:p-12">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10 flex h-full w-full lg:items-center">
        <div className="absolute inset-0 bg-background" />
        <img
          src="/core-bg.webp"
          alt=""
          className="relative h-7/10 w-auto object-cover lg:h-9/10 lg:translate-x-[600px]"
          aria-hidden={true}
        />
      </div>

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:gap-0">
        <img
          src="/governance-logo.svg"
          alt={t(($) => $.common.alt.icpLogo)}
          className="h-6 w-fit invert"
        />
        <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-wide lg:mt-16 lg:max-w-3xl lg:text-7xl">
          {t(($) => $.login.headerTitle)}
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-12">
        {/* Stats Section (Desktop: Bottom Left / Mobile: Below Title) */}
        <dl className="order-1 mt-auto flex flex-col gap-8 lg:order-2 lg:my-auto lg:h-13 lg:flex-row lg:gap-16">
          <div className="flex flex-col-reverse gap-1">
            <dd className="text-2xl leading-none font-bold lg:text-3xl">{proposalsAdopted}</dd>
            <dt className="text-sm font-light tracking-wider text-muted-foreground">
              {t(($) => $.login.proposalsAdopted)}
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden bg-muted-foreground lg:block" />

          <div className="flex flex-col-reverse gap-1">
            <dd className="text-2xl leading-none font-bold lg:text-3xl">
              {formatNumber(participants, { maxFraction: 0, minFraction: 0 })}
            </dd>
            <dt className="text-sm font-light tracking-wider text-muted-foreground">
              {t(($) => $.login.participants)}
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden bg-muted-foreground lg:block" />

          <div className="flex flex-col-reverse gap-1">
            <dd className="text-2xl leading-none font-bold lg:text-3xl">
              $ {formatNumber(tvl, { maxFraction: 0, minFraction: 0 })}
            </dd>
            <dt className="text-sm font-light tracking-wider text-muted-foreground">
              {t(($) => $.login.tvl)}
            </dt>
          </div>
        </dl>

        {/* Login Card Section (Desktop: Middle / Mobile: Bottom) */}
        <div className="order-2 flex w-full max-w-md flex-col items-start gap-4 rounded-3xl border border-white/10 bg-white p-5 text-black backdrop-blur-md md:gap-6 md:p-8 lg:order-1 lg:my-auto lg:min-w-lg">
          <p className="text-xl leading-relaxed font-light text-pretty lg:text-3xl">
            {t(($) => $.login.accessText)}
          </p>

          <Button
            onClick={login}
            className="w-full max-w-92 bg-neutral-900 text-base font-medium text-white hover:bg-neutral-800"
            variant="default"
            size="xxl"
            data-testid="login-btn"
          >
            <img src="/icp-logo.svg" alt="" aria-hidden={true} />
            {t(($) => $.login.loginWithII)}
          </Button>

          <a
            href="https://nns.ic0.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm tracking-wide text-neutral-500 transition-colors hover:text-black hover:underline lg:text-base"
          >
            <ExternalLink className="size-4" aria-hidden={true} />
            <span>{t(($) => $.login.legacyNnsDapp)}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
