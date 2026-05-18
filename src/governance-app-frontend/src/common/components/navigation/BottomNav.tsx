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
    <nav className="z-50 shrink-0 border-t bg-background/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-13 w-full">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex w-full flex-col items-center justify-center text-[color:var(--icp-fg-secondary)] transition-colors hover:text-accent-foreground',
              shouldAnimate && item.href === '/accounts' && 'animate-highlight-pulse',
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
