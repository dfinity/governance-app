import { isNullish, nonNullish } from '@dfinity/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { ensureInitialized, useInternetIdentity } from 'ic-use-internet-identity';
import { ExternalLink } from 'lucide-react';
import { type CSSProperties, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedGovernanceLogo } from '@features/login/components/AnimatedGovernanceLogo';
import { useTvlValue } from '@features/login/hooks/useTvlValue';

import { BetaBanner } from '@components/BetaBanner';
import { Button } from '@components/button';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceProposal } from '@hooks/governance';
import { formatNumber } from '@utils/numbers';

const FADE_MASK_STYLE: CSSProperties = {
  maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
  WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
};

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    const identity = await ensureInitialized();

    if (nonNullish(identity)) {
      throw redirect({ to: search.redirect ?? '/dashboard', replace: true });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const { t } = useTranslation();

  // Enforce dark theme on body for login page
  useLayoutEffect(() => {
    document.body.classList.add('dark');
    return () => {
      document.body.classList.remove('dark');
    };
  }, []);

  const { tvl, isLoading: isTvlLoading, isError: isTvlError } = useTvlValue();
  const participants = 57986;
  const proposalsQuery = useGovernanceProposal();
  const totalProposals = proposalsQuery?.data?.response?.id ?? 0n;

  return (
    <>
      <BetaBanner isLoggedIn={false} />
      <div className="dark relative min-h-dvh w-full font-sans text-foreground">
        {/* Loading Overlay */}
        {isLoggingIn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div
              className="flex flex-col items-center gap-6 text-white"
              role="status"
              aria-live="polite"
            >
              <AnimatedGovernanceLogo />
              <p className="text-lg font-medium">{t(($) => $.login.authenticating)}</p>
            </div>
          </div>
        )}

        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden" data-testid="video-background">
          <div className="absolute inset-0 bg-black" />
          <div className="flex h-full w-full 3xl:mx-auto 3xl:max-w-[2000px] md:items-center">
            {/* Static image for users with reduced motion preference */}
            <img
              src="/core-bg.webp"
              alt=""
              className="relative hidden max-h-[720px] w-fit object-cover motion-reduce:block 3xl:translate-x-3/4 md:max-h-[798px] md:translate-x-1/3 md:-translate-y-12 xl:translate-x-1/2 2xl:translate-x-2/3"
              aria-hidden={true}
              style={FADE_MASK_STYLE}
            />
            {/* Video background - hidden when reduced motion is preferred */}
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="relative max-h-[720px] w-fit object-cover motion-reduce:hidden 3xl:translate-x-3/4 md:max-h-[798px] md:translate-x-1/3 md:-translate-y-12 xl:translate-x-1/2 2xl:translate-x-2/3"
              aria-hidden={true}
              style={FADE_MASK_STYLE}
            >
              <source src="/core-bg-original.webm" type="video/webm" />
              <source src="/core-bg-original.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* Mobile overlay - behind content, above background */}
        <div className="absolute inset-0 -z-[9] bg-black/20 md:hidden" />

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
                <dt className="text-sm font-light tracking-wider text-muted-foreground capitalize">
                  {t(($) => $.login.totalProposals)}
                </dt>
                <dd className="text-2xl leading-none font-bold md:text-3xl">
                  {proposalsQuery?.isLoading ? (
                    <Skeleton className="h-7 w-30 md:h-8" />
                  ) : proposalsQuery?.isError ? (
                    '-/-'
                  ) : (
                    // Safe Number casting as the number of proposals is within the range
                    // totalProposals < Number.MAX_SAFE_INTEGER
                    formatNumber(Number(totalProposals), { minFraction: 0, maxFraction: 0 })
                  )}
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
                  {isTvlLoading && proposalsQuery?.isLoading ? (
                    <Skeleton className="h-7 w-26 md:h-8" />
                  ) : (
                    formatNumber(participants, { maxFraction: 0, minFraction: 0 })
                  )}
                </dd>
              </div>

              <Separator
                orientation="vertical"
                className="hidden bg-muted-foreground/50 md:block"
                aria-hidden={true}
              />

              <div className="flex flex-col-reverse gap-1">
                <dt className="text-sm font-light tracking-wider text-muted-foreground capitalize">
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
                  disabled={isLoggingIn}
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
    </>
  );
}
