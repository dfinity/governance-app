import { useMatches } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Header = () => {
  const { t } = useTranslation();
  const matches = useMatches();

  const match = matches.find((m) => m.staticData?.title);

  const title = match?.staticData?.title ?? 'common.baseTitle';

  return (
    <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-background p-4">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold">{t(title as never)}</h1>
      </div>
    </header>
  );
};
