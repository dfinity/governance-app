import { Link } from '@tanstack/react-router';

import { navigationItems } from './NavigationItems';

export const BottomNav = () => {
  return (
    <nav className="pb-safe fixed right-0 bottom-0 left-0 z-50 flex border-t bg-background/80 backdrop-blur-lg lg:hidden">
      <div className="flex h-16 w-full items-center justify-around">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex h-full w-full flex-col items-center justify-center space-y-1 text-muted-foreground transition-colors hover:text-accent-foreground"
            activeProps={{
              className: 'text-primary',
            }}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
