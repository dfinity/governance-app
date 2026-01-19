import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ManageIICard } from '@features/account-settings/components/ManageIICard';
import { PrincipalCard, AccountIdCard } from '@features/account-settings/components/PrincipalCard';
import { GovernanceAccessCard } from '@features/account-settings/components/GovernanceAccessCard';
import { SystemContextCard } from '@features/account-settings/components/SystemContextCard';

import { MANUAL_LOGOUT_KEY } from '@constants/extra';

import { Button } from '@components/button';
import { Card } from '@components/Card';
import { useSessionTimeLeft } from '@hooks/useSessionTimeLeft';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/account/')({
  component: Settings,
  staticData: {
    title: 'common.accounts',
  },
});

const SettingsSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-4">
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    <Card className="p-0 shadow-sm overflow-hidden">
      <div className="flex flex-col divide-y">
        {Array.isArray(children) ? (
          children.map((child, i) => (
            <div key={i} className="px-6 py-5">
              {child}
            </div>
          ))
        ) : (
          <div className="px-6 py-5">{children}</div>
        )}
      </div>
    </Card>
  </section>
);

function Settings() {
  const { identity, clear } = useInternetIdentity();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.accounts));
  const timeLeft = useSessionTimeLeft();

  const handleLogout = () => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  };

  return (
    <div className="flex flex-col gap-12 pb-20">
      <SettingsSection
        title={t(($) => $.accountSettings.account)}
        description={t(($) => $.accountSettings.accountDescription)}
      >
        <PrincipalCard />
        <AccountIdCard />
        <ManageIICard />
      </SettingsSection>

      <section className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t(($) => $.accountSettings.governance.title)}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 shadow-sm">
            <GovernanceAccessCard />
          </Card>
          <Card className="p-6 shadow-sm">
            <SystemContextCard />
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t(($) => $.accountSettings.session.title)}
          </h2>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              {t(($) => $.accountSettings.session.signOutDescription)}
            </p>
            {timeLeft && (
              <p className="text-sm text-muted-foreground">
                {t(($) => $.accountSettings.session.timeLeft, {
                  minutes: timeLeft.minutes,
                  seconds: timeLeft.seconds.toString().padStart(2, '0'),
                })}
              </p>
            )}
          </div>
        </div>
        {identity && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="w-full sm:w-auto self-start border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
            data-testid="logout-btn"
          >
            <LogOut className="mr-2 size-5" />
            {t(($) => $.common.logout)}
          </Button>
        )}
      </section>
    </div>
  );
}
