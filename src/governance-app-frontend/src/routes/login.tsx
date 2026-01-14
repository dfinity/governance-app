import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useProposalsAdoptedLastXDays } from '@features/proposals/hooks/useProposalsAdoptedLastXDays';

import { Button } from '@components/button';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
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

  // @TODO: To be replaced with real data
  const tvl = 812865900;
  const participants = 57986;

  const { proposals, isLoading } = useProposalsAdoptedLastXDays(30);
  const proposalsAdopted = proposals.length;

  if (identity) return <Navigate to={redirect} />;

  return (
    <div className="dark relative min-h-dvh w-full font-sans text-foreground">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="flex h-full w-full 3xl:mx-auto 3xl:max-w-[2000px] lg:items-center">
          <img
            src="/core-bg.webp"
            alt=""
            className="relative max-h-[720px] w-fit object-cover 3xl:translate-x-2/3 lg:max-h-[798px] lg:translate-x-1/3 xl:translate-x-1/2"
            aria-hidden={true}
            loading="lazy"
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-dvh w-full flex-col justify-between px-4 py-10 3xl:mx-auto 3xl:max-w-[2000px] sm:p-12">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:gap-0">
          <img
            src="/governance-logo.svg"
            alt={t(($) => $.common.alt.icpLogo)}
            className="h-6 w-fit invert"
          />
          <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-wide lg:mt-12 lg:max-w-3xl lg:text-7xl">
            {t(($) => $.login.headerTitle)}
          </h1>
        </div>

        <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-center lg:flex-col lg:items-stretch lg:gap-0">
          {/* Stats Section (Desktop: Bottom Left / Mobile: Below Title) */}
          <dl className="order-1 mt-auto flex flex-col gap-8 md:order-2 md:mt-0 lg:my-auto lg:mt-auto lg:h-13 lg:flex-row lg:gap-16">
            <div className="flex flex-col-reverse gap-1">
              <dt className="text-sm font-light tracking-wider text-muted-foreground">
                {t(($) => $.login.proposalsAdopted)}
              </dt>
              <dd className="text-2xl leading-none font-bold lg:text-3xl">{proposalsAdopted}</dd>
            </div>

            <Separator
              orientation="vertical"
              className="hidden bg-muted-foreground/50 lg:block"
              aria-hidden={true}
            />

            <div className="flex flex-col-reverse gap-1">
              <dt className="text-sm font-light tracking-wider text-muted-foreground">
                {t(($) => $.login.participants)}
              </dt>
              <dd className="text-2xl leading-none font-bold lg:text-3xl">
                {formatNumber(participants, { maxFraction: 0, minFraction: 0 })}
              </dd>
            </div>

            <Separator
              orientation="vertical"
              className="hidden bg-muted-foreground/50 lg:block"
              aria-hidden={true}
            />

            <div className="flex flex-col-reverse gap-1">
              <dt className="text-sm font-light tracking-wider text-muted-foreground">
                {t(($) => $.login.tvl)}
              </dt>
              <dd className="text-2xl leading-none font-bold lg:text-3xl">
                ${formatNumber(tvl, { maxFraction: 0, minFraction: 0 })}
              </dd>
            </div>
          </dl>

          {/* Login Card Section  */}
          <div className="order-2 flex w-full max-w-lg flex-col gap-6 rounded-3xl border border-white/10 bg-white p-5 text-black backdrop-blur-md sm:p-7 md:order-1 lg:my-auto lg:min-w-lg">
            <p className="text-xl font-light text-pretty lg:text-3xl">
              {t(($) => $.login.accessText)}
            </p>

            <div className="flex flex-col gap-4">
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
      </div>
    </div>
  );
}
