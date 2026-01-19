import { useMatches } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ThemeSwitcher } from './ThemeSwitcher';
import { UserMenu } from './UserMenu';

export const Header = () => {
  const { t } = useTranslation();
  const matches = useMatches();

  const match = matches.find((m) => m.staticData?.title);
  const title = match?.staticData?.title ?? 'common.baseTitle';

  return (
    <header className="sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b bg-background">
      <div className="flex h-full items-center px-4">
        <h1 className="text-base font-semibold">{t(title as never)}</h1>
      </div>

      <div className="flex h-full items-stretch">
        <div className="flex border-l">
          <ThemeSwitcher />
        </div>
        <div className="flex border-l">
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
