import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { cn } from '@utils/shadcn';

import { getNavigationItems } from './NavigationItems';

export const BottomNav = () => {
  const { t } = useTranslation();
  const { features } = useAdvancedFeatures();
  const subaccountsEnabled = features.subaccounts;
  const navigationItems = getNavigationItems({ subaccountsEnabled });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeIndex = navigationItems.findIndex((item) => pathname.startsWith(item.href));

  const [prevEnabled, setPrevEnabled] = useState(subaccountsEnabled);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [lensMoves, setLensMoves] = useState(0);

  if (subaccountsEnabled !== prevEnabled) {
    setPrevEnabled(subaccountsEnabled);
    if (subaccountsEnabled) {
      setShouldAnimate(true);
    }
  }

  if (activeIndex !== prevIndex) {
    setPrevIndex(activeIndex);
    setLensMoves((moves) => moves + 1);
  }

  return (
    <nav
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-50 px-5 pb-(--bottom-nav-gap) lg:hidden',
        // Fades the content below the capsule into the page, like the iOS scroll edge effect.
        'before:absolute before:inset-0 before:bg-linear-to-t before:from-main-content/85 before:to-transparent before:[mask-image:linear-gradient(to_top,black_40%,transparent)] before:backdrop-blur-[2px]',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-auto flex h-(--bottom-nav-height) max-w-md rounded-full p-1',
          'border border-white/60 bg-background/30 ring-1 ring-black/5 backdrop-blur-[10px] backdrop-brightness-110 backdrop-saturate-180',
          'shadow-[0_10px_28px_-10px_rgb(0_0_0/0.22),0_1px_3px_rgb(0_0_0/0.06),inset_0_1px_0_0_rgb(255_255_255/0.9),inset_0_-1px_0_0_rgb(255_255_255/0.35),inset_0_0_14px_rgb(255_255_255/0.35)]',
          'dark:border-white/15 dark:bg-background/35 dark:shadow-[0_10px_28px_-10px_rgb(0_0_0/0.7),inset_0_1px_0_0_rgb(255_255_255/0.14),inset_0_0_14px_rgb(255_255_255/0.05)] dark:ring-black/40 dark:backdrop-brightness-90',
          'contrast-more:border-border contrast-more:bg-background',
        )}
      >
        {activeIndex >= 0 && (
          <span
            aria-hidden={true}
            className={cn(
              'absolute inset-y-1 left-1 rounded-full transition-[translate] duration-500 ease-[cubic-bezier(0.32,1.25,0.5,1)] motion-reduce:transition-none',
              'bg-black/6 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.05),inset_0_1px_0_0_rgb(255_255_255/0.9),0_1px_3px_rgb(0_0_0/0.08)]',
              'dark:bg-white/6 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.3)]',
              lensMoves > 0 &&
                (lensMoves % 2 === 0 ? 'animate-lens-stretch-a' : 'animate-lens-stretch-b'),
            )}
            style={{
              width: `calc((100% - 0.5rem) / ${navigationItems.length})`,
              translate: `${activeIndex * 100}% 0`,
            }}
          />
        )}
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full text-foreground-secondary transition-[color,scale] duration-200 hover:text-accent-foreground active:scale-94',
              shouldAnimate && item.href === '/accounts' && 'animate-highlight-pulse',
            )}
            onAnimationEnd={item.href === '/accounts' ? () => setShouldAnimate(false) : undefined}
            activeProps={{
              className: 'text-primary dark:text-accent-foreground',
            }}
            aria-label={t(item.label as never)}
          >
            <item.icon className="size-5.5 transition-[fill] group-data-[status=active]:fill-primary/15 dark:group-data-[status=active]:fill-accent-foreground/20" />
            <span className="truncate text-[10px] leading-none font-medium group-data-[status=active]:font-semibold">
              {t(item.tabLabel as never)}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
