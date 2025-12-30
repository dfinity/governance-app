import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

import { Button } from '@/common/components/button';
import { PrincipalCard } from '@/features/settings/components/PrincipalCard';
import { ThemeCard } from '@/features/settings/components/ThemeCard';

export const Route = createFileRoute('/settings/')({
  component: Settings,
  staticData: {
    title: 'common.settings',
  },
});

function Settings() {
  const { identity, clear } = useInternetIdentity();
  const { t } = useTranslation();

  const handleLogout = () => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="mb-2 text-sm leading-relaxed font-semibold tracking-wider text-gray-500 uppercase">
          {t(($) => $.settings.general)}
        </h2>
        <ThemeCard />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="mb-2 text-sm leading-relaxed font-semibold tracking-wider text-gray-500 uppercase">
          {t(($) => $.settings.account)}
        </h2>
        <PrincipalCard />
      </section>

      <Button
        variant="destructive"
        size="lg"
        onClick={handleLogout}
        disabled={!identity}
        data-testid="logout-btn"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {t(($) => $.common.logout)}
      </Button>
    </div>
  );
}
