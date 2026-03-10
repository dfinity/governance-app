import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSubaccountsEnabled } from '@hooks/useSubaccountsEnabled';
import { cn } from '@utils/shadcn';

import { getNavigationItems } from './NavigationItems';

export const BottomNav = () => {
  const { t } = useTranslation();
  const { enabled: subaccountsEnabled } = useSubaccountsEnabled();
  const navigationItems = useMemo(
    () => getNavigationItems({ subaccountsEnabled }),
    [subaccountsEnabled],
  );

  return (
    <nav className="z-50 shrink-0 border-t bg-background/80 shadow-[0_-3px_12px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden">
      <div className="flex h-13 w-full items-end">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors hover:text-accent-foreground',
              item.isDynamic && 'animate-highlight-pulse',
            )}
            activeProps={{
              className: 'text-primary font-semibold',
            }}
          >
            <item.icon className="size-5" />
            <span className="text-[11px] font-medium">{t(item.label as never)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
