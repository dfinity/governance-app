import { useLocation, useMatchRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { navigationItems } from './NavigationItems';

const getTitle = (matchRoute: ReturnType<typeof useMatchRoute>) => {
  const matchingItem = navigationItems.find((item) =>
    matchRoute({ to: item.href, pending: true, fuzzy: true }),
  );
  return matchingItem?.label ?? 'common.baseTitle';
};

export const Header = () => {
  const { t } = useTranslation();
  const matchRoute = useMatchRoute();
  const location = useLocation();
  const [title, setTitle] = useState<string>(() => getTitle(matchRoute));

  useEffect(() => setTitle(getTitle(matchRoute)), [matchRoute, location]);

  return (
    <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-background p-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{t(title as never)}</h1>
      </div>
    </header>
  );
};
