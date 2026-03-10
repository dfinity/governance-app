import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSubaccountsEnabled } from '@hooks/useSubaccountsEnabled';
import { cn } from '@utils/shadcn';

import { getNavigationItems } from './NavigationItems';

export const Sidebar = () => {
  const { t } = useTranslation();
  const { enabled: subaccountsEnabled } = useSubaccountsEnabled();
  const navigationItems = useMemo(
    () => getNavigationItems({ subaccountsEnabled }),
    [subaccountsEnabled],
  );

  return (
    <aside className="sticky top-0 z-20 hidden h-full w-72 flex-col border-r bg-card text-sm lg:flex">
      <div className="flex h-14 items-center px-6">
        <img
          src="/governance-logo.svg"
          alt=""
          className="me-4 h-[1.375rem] text-foreground dark:invert"
          aria-hidden="true"
        />
        <span className="text-xs leading-tight font-semibold">Network Nervous System</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              item.isDynamic && 'animate-highlight-pulse',
            )}
            activeProps={{
              className:
                'before:absolute before:left-0 before:w-[3px] before:h-6 before:bg-black before:rounded-xl bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            }}
          >
            <item.icon className="size-5" />
            <span>{t(item.label as never)}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};
