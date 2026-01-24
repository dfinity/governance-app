import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navigationItems } from './NavigationItems';

export const BottomNav = () => {
  const { t } = useTranslation();

  /*
   * Compact bottom navigation optimized for mobile:
   * - pb-[env(safe-area-inset-bottom)]: only iOS home indicator safe area
   * - Buttons have h-16 (64px) for comfortable touch targets
   * - Total height: 64px + safe-area-inset-bottom
   */
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_12px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden">
      <div className="flex w-full">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-accent-foreground"
            activeProps={{
              className: 'text-primary font-semibold',
            }}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{t(item.label as never)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
