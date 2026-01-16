import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTvlValue } from '@features/login/hooks/useTvlValue';
import { useProposalsAdoptedLastXDays } from '@features/proposals/hooks/useProposalsAdoptedLastXDays';

import { Button } from '@components/button';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { isNullish } from '@dfinity/utils';
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

  const { tvl, isLoading: isTvlLoading, isError: isTvlError } = useTvlValue();
  const participants = 57986;

  const { proposals, isLoading } = useProposalsAdoptedLastXDays(30);
  const proposalsAdopted = proposals.length;

  if (identity) return <Navigate to={redirect} />;

  return (
    <div className="dark relative min-h-dvh w-full font-sans text-foreground">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="flex h-full w-full 3xl:mx-auto 3xl:max-w-[2000px] md:items-center">
          {/* Static image for users with reduced motion preference */}
          <img
            src="/core-bg.webp"
            alt=""
            className="relative hidden max-h-[720px] w-fit object-cover motion-reduce:block 3xl:translate-x-2/3 md:max-h-[798px] md:translate-x-1/3 xl:translate-x-1/2"
            aria-hidden={true}
          />
          {/* Video background - hidden when reduced motion is preferred */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="relative max-h-[720px] w-fit object-cover motion-reduce:hidden 3xl:translate-x-2/3 md:max-h-[798px] md:translate-x-1/3 xl:translate-x-1/2"
            aria-hidden={true}
          >
            <source src="/core-bg.webm" type="video/webm" />
            <source src="/core-bg.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Mobile overlay - behind content, above background */}
      <div className="absolute inset-0 -z-[9] bg-black/25 md:hidden" />

      {/* Content */}
      <div className="relative flex min-h-dvh w-full flex-col justify-between px-4 py-10 3xl:mx-auto 3xl:max-w-[2000px] sm:p-12">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:mb-12 md:gap-0">
          <img
            src="/governance-logo.svg"
            alt={t(($) => $.common.alt.icpLogo)}
            className="h-6 w-fit invert"
          />
          <h1 className="text-hero-responsive mt-4 mb-6 max-w-xl font-bold tracking-wide md:mt-12 md:mb-0 md:max-w-3xl">
            {t(($) => $.login.headerTitle)}
          </h1>
        </div>

        <div className="flex flex-1 flex-col gap-6 md:flex-col md:items-stretch md:gap-8">
          {/* Stats Section (Desktop: Bottom / Mobile: Below Title) */}
          <dl className="order-1 mt-auto flex flex-col gap-8 md:order-2 md:mt-auto md:mb-6 md:h-13 md:flex-row md:gap-16">
            <div className="flex flex-col-reverse gap-1">
              <dt className="text-sm font-light tracking-wider text-muted-foreground">
                {t(($) => $.login.proposalsAdopted)}
              </dt>
              <dd className="text-2xl leading-none font-bold md:text-3xl">
                {isLoading ? <Skeleton className="h-7 w-8 md:h-8" /> : proposalsAdopted}
              </dd>
            </div>

            <Separator
              orientation="vertical"
              className="hidden bg-muted-foreground/50 md:block"
              aria-hidden={true}
            />

            <div className="flex flex-col-reverse gap-1">
              <dt className="text-sm font-light tracking-wider text-muted-foreground">
                {t(($) => $.login.participants)}
              </dt>
              <dd className="text-2xl leading-none font-bold md:text-3xl">
                {formatNumber(participants, { maxFraction: 0, minFraction: 0 })}
              </dd>
            </div>

            <Separator
              orientation="vertical"
              className="hidden bg-muted-foreground/50 md:block"
              aria-hidden={true}
            />

            <div className="flex flex-col-reverse gap-1">
              <dt className="text-sm font-light tracking-wider text-muted-foreground">
                {t(($) => $.login.tvl)}
              </dt>
              <dd className="text-2xl leading-none font-bold md:text-3xl">
                {isTvlLoading ? (
                  <Skeleton className="h-7 w-52 md:h-8" />
                ) : isTvlError || isNullish(tvl) ? (
                  '-'
                ) : (
                  `$${formatNumber(tvl, { maxFraction: 0, minFraction: 0 })}`
                )}
              </dd>
            </div>
          </dl>

          {/* Login Card Section  */}
          <div className="order-2 flex w-full flex-col gap-6 rounded-3xl border border-white/10 bg-white p-5 text-black backdrop-blur-md sm:p-7 md:order-1 md:my-auto md:max-w-lg md:min-w-lg">
            <p className="login-card-responsive font-light text-pretty">
              {t(($) => $.login.accessText)}
            </p>

            <div className="flex flex-col gap-4">
              <Button
                onClick={login}
                className="w-full bg-neutral-900 text-base font-medium text-white hover:bg-neutral-800"
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
                className="flex items-center gap-2 text-sm tracking-wide text-neutral-500 transition-colors hover:text-black hover:underline md:text-base"
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
