import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navigationItems } from './NavigationItems';

export const BottomNav = () => {
  const { t } = useTranslation();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 flex border-t bg-background/80 p-4 shadow-[0_-3px_12px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden">
      <div className="flex h-16 w-full items-center justify-around">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex h-full w-full flex-col items-center justify-center space-y-1 rounded-lg text-muted-foreground transition-colors hover:text-accent-foreground"
            activeProps={{
              className: 'bg-primary/10 text-primary font-semibold',
            }}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-[12px] font-medium">{t(() => item.label)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
