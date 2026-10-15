import { Link } from '@tanstack/react-router';
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

  const [prevEnabled, setPrevEnabled] = useState(subaccountsEnabled);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  if (subaccountsEnabled !== prevEnabled) {
    setPrevEnabled(subaccountsEnabled);
    if (subaccountsEnabled) {
      setShouldAnimate(true);
    }
  }

  return (
    <nav
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-50 px-5 pb-(--bottom-nav-gap) lg:hidden',
        // Fades the content that scrolls behind the capsule.
        'before:absolute before:inset-0 before:bg-linear-to-t before:from-main-content/90 before:via-main-content/50 before:to-transparent',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-auto flex h-(--bottom-nav-height) max-w-md gap-0.5 rounded-full p-1',
          'border border-white/70 bg-background/60 ring-1 ring-black/6 backdrop-blur-xl backdrop-saturate-150',
          'shadow-[0_12px_32px_-12px_rgb(0_0_0/0.28),0_2px_6px_-2px_rgb(0_0_0/0.08),inset_0_1px_0_0_rgb(255_255_255/0.85)]',
          'dark:border-white/12 dark:bg-background/55 dark:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7),inset_0_1px_0_0_rgb(255_255_255/0.08)] dark:ring-black/40',
          'contrast-more:border-border contrast-more:bg-background',
        )}
      >
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full text-foreground-secondary transition-colors hover:text-accent-foreground',
              shouldAnimate && item.href === '/accounts' && 'animate-highlight-pulse',
            )}
            onAnimationEnd={item.href === '/accounts' ? () => setShouldAnimate(false) : undefined}
            activeProps={{
              className: 'bg-primary/10 text-primary dark:bg-primary/15',
            }}
            aria-label={t(item.label as never)}
          >
            <item.icon className="size-5.5" />
            <span className="truncate text-[10px] leading-none font-medium">
              {t(item.tabLabel as never)}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
