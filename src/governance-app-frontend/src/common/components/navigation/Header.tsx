import { useLocation } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

import { navigationItems } from './NavigationItems';

export const Header = () => {
  const { login, identity } = useInternetIdentity();
  const { t } = useTranslation();
  const location = useLocation();

  // This might need more robust matching for sub-routes if they exist later
  const currentItem = navigationItems.find((item) => item.href === location.pathname);
  const title = currentItem ? currentItem.label : 'Governance'; // Default value

  return (
    <header className="sticky top-0 z-10 mb-4 flex w-full items-center justify-between border-b bg-background px-8 py-6 md:mb-0">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Temporal until the login page is introduced */}
        {!identity && (
          <Button onClick={login} variant="outline" size="sm">
            <LogIn />
            {t(($) => $.common.login)}
          </Button>
        )}
      </div>
    </header>
  );
};
