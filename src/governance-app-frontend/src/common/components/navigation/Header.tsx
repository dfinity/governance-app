import { useMatchRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { navigationItems } from './NavigationItems';

export const Header = () => {
  const { t } = useTranslation();
  const matchRoute = useMatchRoute();

  const currentItem = navigationItems.find((item) => matchRoute({ to: item.href, fuzzy: true }));
  const title = currentItem ? currentItem.label : 'common.baseTitle';

  return (
    <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-background p-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{t(title as never)}</h1>
      </div>
    </header>
  );
};
