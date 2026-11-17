import { Link, useMatches } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { isAccountsAreaEnabled } from '@utils/advancedFeatures';
import { cn } from '@utils/shadcn';

import { getNavigationItems } from './NavigationItems';

export const BottomNav = ({ activeHref }: { activeHref?: string }) => {
  const { t } = useTranslation();
  const { features } = useAdvancedFeatures();
  const accountsEnabled = isAccountsAreaEnabled(features);
  const navigationItems = getNavigationItems({ accountsEnabled });
  const hidden = useMatches({
    select: (matches) => matches.some((match) => match.staticData.hidesBottomNav),
  });

  const [prevEnabled, setPrevEnabled] = useState(accountsEnabled);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  if (accountsEnabled !== prevEnabled) {
    setPrevEnabled(accountsEnabled);
    if (accountsEnabled) {
      setShouldAnimate(true);
    }
  }

  if (hidden) return null;

  return (
    <nav className="z-50 shrink-0 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
      <div className="flex h-13 w-full">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex w-full flex-col items-center justify-center text-foreground-secondary transition-colors hover:text-accent-foreground',
              shouldAnimate && item.href === '/accounts' && 'animate-highlight-pulse',
              activeHref?.startsWith(item.href) && 'text-primary',
            )}
            onAnimationEnd={item.href === '/accounts' ? () => setShouldAnimate(false) : undefined}
            activeProps={{
              className: 'text-primary',
            }}
            aria-label={t(item.label as never)}
          >
            <item.icon className="size-6" />
          </Link>
        ))}
      </div>
    </nav>
  );
};
