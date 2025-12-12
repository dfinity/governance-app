import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navigationItems } from './NavigationItems';

export const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-72 flex-col border-r bg-card shadow-[1px_0_3px_rgba(0,0,0,0.04),1px_0_0_rgba(0,0,0,0.02)] lg:flex">
      <div className="p-6">
        <span className="text-2xl font-bold">Governance</span>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeProps={{
              className:
                'before:w-[3px] before:h-6 before:bg-black before:rounded-xl before:-ml-4 bg-primary/10 text-primary font-semibold hover:bg-primary/15 hover:text-primary',
            }}
          >
            <item.icon className="h-6 w-6" />
            <span>{t(() => item.label)}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};
