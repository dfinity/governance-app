import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { isPwa } from '@hooks/usePwaBootReady';

import { navigationItems } from './NavigationItems';

export const BottomNav = () => {
  const { t } = useTranslation();
  const pwa = isPwa();

  return (
    <nav
      className={
        pwa
          ? 'fixed bottom-0 left-0 right-0 z-50 border-t border-t-amber-500 bg-amber-500/30 pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_12px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden'
          : 'z-50 shrink-0 border-t border-t-amber-500 bg-amber-500/30 pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_12px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden'
      }
    >
      <div className="flex w-full">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex h-13 w-full flex-col items-center justify-end gap-1 text-muted-foreground transition-colors hover:text-accent-foreground"
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
