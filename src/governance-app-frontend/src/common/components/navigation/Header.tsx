import { useLocation, useMatchRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navigationItems as items } from './NavigationItems';

export const Header = () => {
  const { t } = useTranslation();
  const matchRoute = useMatchRoute();
  const location = useLocation();

  const pending = items.find(({ href }) => matchRoute({ to: href, fuzzy: true, pending: true }));
  const active = items.find(({ href }) => matchRoute({ to: href, fuzzy: true }));

  const current = pending || active;
  const title = current ? current.label : 'common.baseTitle';

  return (
    <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-background p-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold" key={location.pathname}>
          {t(title as never)}
        </h1>
      </div>
    </header>
  );
};
