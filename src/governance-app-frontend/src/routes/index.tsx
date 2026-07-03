import { isNullish, nonNullish } from '@dfinity/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { ensureInitialized, useInternetIdentity } from 'ic-use-internet-identity';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedGovernanceLogo } from '@features/login/components/AnimatedGovernanceLogo';

import { AnimatedNumber } from '@components/AnimatedNumber';
import { Button } from '@components/button';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { Theme } from '@constants/theme';
import { useGovernanceProposal } from '@hooks/governance';
import { useTheme } from '@hooks/useTheme';
import { useTvlValue } from '@hooks/useTvlValue';
import { isSafeInternalRedirect } from '@utils/router';

import i18n from '@/i18n/config';

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      // Only accept same-origin internal paths to prevent open-redirect abuse.
      redirect: isSafeInternalRedirect(search.redirect) ? search.redirect : undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    const identity = await ensureInitialized();

    if (nonNullish(identity)) {
      throw redirect({ to: search.redirect ?? '/dashboard', replace: true });
    }
  },
  component: LoginPage,
  head: () => {
    const title = i18n.t(($) => $.common.head.login.title);
    const description = i18n.t(($) => $.common.head.login.description);

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        // Open Graph
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: '/og-image.webp' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: '/og-image.webp' },
      ],
    };
  },
});

function LoginPage() {
  const { login, isLoggingIn, isLoginSuccess } = useInternetIdentity();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [isVideoReady, setIsVideoReady] = useState(false);
  const baseVideoRef = useRef<HTMLVideoElement>(null);
  const coreVideoRef = useRef<HTMLVideoElement>(null);
  const { tvl, isLoading: isTvlLoading, isError: isTvlError } = useTvlValue();
  const participants = 57986;
  const proposalsQuery = useGovernanceProposal();
  const totalProposals = proposalsQuery?.data?.response?.id ?? 0n;
  const allStatsReady = !isTvlLoading && !proposalsQuery?.isLoading;

  // Keep the two background video layers loosely in sync without per-frame seeking.
  useEffect(() => {
    const base = baseVideoRef.current;
    const core = coreVideoRef.current;
    if (!base || !core) return;

    const syncInterval = window.setInterval(() => {
      if (Math.abs(core.currentTime - base.currentTime) > 0.2) {
        core.currentTime = base.currentTime;
      }
    }, 400);

    return () => window.clearInterval(syncInterval);
  }, []);

  return (
    <>
      <div className="login-page relative isolate min-h-dvh w-full font-sans text-foreground">
        {/* Loading Overlay */}
        {(isLoggingIn || isLoginSuccess) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div
              className="flex flex-col items-center gap-6 text-foreground"
              role="status"
              aria-live="polite"
            >
              <AnimatedGovernanceLogo />
              <p className="text-lg font-medium">{t(($) => $.login.authenticating)}</p>
            </div>
          </div>
        )}

        {/* Background */}
        <div className="absolute inset-0 z-0 overflow-hidden" data-testid="video-background">
          <div className="absolute inset-0 bg-background" />
          <div className="flex h-full w-full items-center 3xl:mx-auto 3xl:max-w-[2000px]">
            {/* Static image for users with reduced motion preference */}
            <img
              src="/core-bg.webp"
              alt=""
              className="login-vfx-base relative hidden max-h-[720px] w-fit scale-125 object-cover motion-reduce:block 3xl:translate-x-3/4 md:max-h-[798px] md:translate-x-1/3 md:-translate-y-12 md:scale-100 xl:translate-x-1/2 2xl:translate-x-2/3"
              aria-hidden={true}
            />
            {/* Video background - two layered copies, hidden when reduced motion is preferred */}
            <div
              className={`relative w-fit scale-125 transition-opacity duration-1000 ease-in motion-reduce:hidden 3xl:translate-x-3/4 md:translate-x-1/3 md:-translate-y-12 md:scale-100 xl:translate-x-1/2 2xl:translate-x-2/3 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
            >
              {/* Base: inked-on-parchment treatment with feathered edges. */}
              <video
                ref={baseVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onCanPlayThrough={() => setIsVideoReady(true)}
                className="login-vfx-base block max-h-[720px] w-fit object-cover md:max-h-[798px]"
                aria-hidden={true}
              >
                <source src="/core-bg-original.webm" type="video/webm" />
                <source src="/core-bg-original.mp4" type="video/mp4" />
              </video>
              {/* Core: original colors revealed in a soft radial center. */}
              <video
                ref={coreVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="login-vfx-core absolute inset-0 size-full object-cover"
                aria-hidden={true}
              >
                <source src="/core-bg-original.webm" type="video/webm" />
                <source src="/core-bg-original.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
          <div className="absolute inset-0 bg-background/35 dark:bg-background/5" />
          <div className="icp-grid-paper-overlay [--icp-grid-line:rgba(26,26,26,0.04)] dark:[--icp-grid-line:rgba(240,235,224,0.05)]" />
        </div>

        {/* Mobile overlay - behind content, above background */}
        <div className="absolute inset-0 z-[1] bg-background/20 md:hidden" />

        {/* Content */}
        <div className="relative z-10 flex min-h-dvh w-full flex-col justify-between px-4 py-10 3xl:mx-auto 3xl:max-w-[2000px] sm:p-12">
          {/* Header Section */}
          <div className="relative flex flex-col gap-6 md:mb-12 md:gap-0">
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex w-fit items-center gap-4">
                <img src="/infinity-mark.png" alt="" aria-hidden={true} className="h-6 w-fit" />
                <span className="text-sm leading-tight font-semibold">
                  {t(($) => $.common.head.appName)}
                </span>
              </div>
              <ToggleGroup
                type="single"
                size="sm"
                value={theme}
                onValueChange={(value: Theme) => {
                  if (value) setTheme(value);
                }}
                className="rounded-md border bg-background/80 backdrop-blur-sm"
              >
                <ToggleGroupItem
                  value={Theme.Light}
                  aria-label={t(($) => $.userAccount.aria.toggleLight)}
                  title={t(($) => $.userAccount.aria.toggleLight)}
                  className="px-2"
                >
                  <Sun className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={Theme.Dark}
                  aria-label={t(($) => $.userAccount.aria.toggleDark)}
                  title={t(($) => $.userAccount.aria.toggleDark)}
                  className="px-2"
                >
                  <Moon className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={Theme.System}
                  aria-label={t(($) => $.userAccount.aria.toggleSystem)}
                  title={t(($) => $.userAccount.aria.toggleSystem)}
                  className="px-2"
                >
                  <Monitor className="size-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <h1 className="animate-fade-up text-hero-responsive mt-4 mb-6 max-w-xl font-serif font-normal tracking-tight md:mt-12 md:mb-0 md:max-w-3xl 2xl:mt-30 2xl:max-w-4xl">
              <Trans
                i18nKey="login.headerTitle"
                components={{ em: <em className="text-primary italic" /> }}
              />
            </h1>
          </div>

          <div className="flex flex-1 flex-col gap-6 md:flex-col md:items-stretch md:gap-8">
            {/* Stats Section (Desktop: Bottom / Mobile: Below Title) */}
            <dl className="animate-fade-up animate-delay-400 order-1 mt-auto mb-4 flex flex-col gap-8 md:order-2 md:mb-6 md:h-13 md:flex-row md:gap-16">
              <div className="flex flex-col-reverse gap-1">
                <dt className="font-sans text-sm font-light tracking-wider text-muted-foreground">
                  {t(($) => $.login.totalProposals)}
                </dt>
                <dd className="font-mono text-2xl leading-none font-medium md:text-3xl">
                  {!allStatsReady ? (
                    <Skeleton className="h-7 w-30 md:h-8" />
                  ) : proposalsQuery?.isError ? (
                    '-/-'
                  ) : (
                    <AnimatedNumber
                      value={Number(totalProposals)}
                      formatOptions={{ minFraction: 0, maxFraction: 0 }}
                    />
                  )}
                </dd>
              </div>

              <Separator
                orientation="vertical"
                className="hidden bg-muted-foreground/25 md:block dark:bg-muted-foreground/50"
                aria-hidden={true}
              />

              <div className="flex flex-col-reverse gap-1">
                <dt className="font-sans text-sm font-light tracking-wider text-muted-foreground">
                  {t(($) => $.login.participants)}
                </dt>
                <dd className="font-mono text-2xl leading-none font-medium md:text-3xl">
                  {!allStatsReady ? (
                    <Skeleton className="h-7 w-26 md:h-8" />
                  ) : (
                    <AnimatedNumber
                      value={participants}
                      formatOptions={{ minFraction: 0, maxFraction: 0 }}
                    />
                  )}
                </dd>
              </div>

              <Separator
                orientation="vertical"
                className="hidden bg-muted-foreground/25 md:block dark:bg-muted-foreground/50"
                aria-hidden={true}
              />

              <div className="flex flex-col-reverse gap-1">
                <dt className="font-sans text-sm font-light tracking-wider text-muted-foreground">
                  {t(($) => $.login.tvl)}
                </dt>
                <dd className="font-mono text-2xl leading-none font-medium md:text-3xl">
                  {!allStatsReady ? (
                    <Skeleton className="h-7 w-52 md:h-8" />
                  ) : isTvlError || isNullish(tvl) ? (
                    '-'
                  ) : (
                    <AnimatedNumber
                      value={tvl}
                      prefix="$"
                      formatOptions={{ minFraction: 0, maxFraction: 0 }}
                    />
                  )}
                </dd>
              </div>
            </dl>

            {/* Login Card Section  */}
            <div className="animate-fade-up animate-delay-200 order-2 flex w-full flex-col gap-6 rounded-[6px] border border-border bg-card/95 p-5 text-card-foreground sm:p-7 md:order-1 md:my-auto md:max-w-lg md:min-w-lg">
              <p className="login-card-responsive font-light text-pretty">
                {t(($) => $.login.accessText)}
              </p>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={login}
                  disabled={isLoggingIn}
                  className="w-full text-base"
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
                  className="flex items-center gap-2 text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground hover:underline md:text-base"
                >
                  <span>{t(($) => $.login.legacyNnsDapp)}</span>
                  <span aria-hidden={true}>↗</span>
                  <span className="sr-only">{t(($) => $.common.opensInNewTab)}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
