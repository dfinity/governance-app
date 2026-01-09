import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navigationItems } from './NavigationItems';

export const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-72 flex-col border-r bg-card text-sm shadow-[1px_0_3px_rgba(0,0,0,0.04),1px_0_0_rgba(0,0,0,0.02)] lg:flex">
      <div className="flex items-center p-6 pt-4">
        <img
          src="/governance-logo.svg"
          alt=""
          className="me-4 h-[1.375rem] text-foreground"
          aria-hidden="true"
        />
        <span className="text-base font-semibold">Governance</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="relative flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
