import { Link } from '@tanstack/react-router';

import { navigationItems } from './NavigationItems';

export const Sidebar = () => {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-card lg:flex">
      <div className="p-6">
        <span className="text-xl font-bold">Governance</span>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeProps={{
              className:
                'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary',
            }}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};
