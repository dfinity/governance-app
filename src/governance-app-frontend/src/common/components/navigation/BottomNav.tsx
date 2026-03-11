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
    <nav className="z-50 shrink-0 border-t bg-background/80 shadow-[0_-3px_12px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden">
      <div className="flex h-13 w-full">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex w-full flex-col items-center justify-center text-muted-foreground transition-colors hover:text-accent-foreground',
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
