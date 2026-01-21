import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountIdCard } from '@features/userAccount/components/AccountIdCard';
import { GovernanceAccessCard } from '@features/userAccount/components/GovernanceAccessCard';
import { ManageIICard } from '@features/userAccount/components/ManageIICard';
import { PrincipalCard } from '@features/userAccount/components/PrincipalCard';
import { SystemContextCard } from '@features/userAccount/components/SystemContextCard';
import { ThemeCard } from '@features/userAccount/components/ThemeCard';

import { Button } from '@components/button';
import { Card } from '@components/Card';
import { MANUAL_LOGOUT_KEY } from '@constants/extra';
import { useSessionTimeLeft } from '@hooks/useSessionTimeLeft';
import useTitle from '@hooks/useTitle';
import { warningNotification } from '@utils/notification';

export const Route = createFileRoute('/account/')({
  component: Account,
  staticData: {
    title: 'common.accounts',
  },
});

function Account() {
  const { identity, clear } = useInternetIdentity();
  const { t } = useTranslation();
  const timeLeft = useSessionTimeLeft();
  const hasBeenNotified = useRef(false);

  useTitle(t(($) => $.common.accounts));

  useEffect(() => {
    if (
      timeLeft.minutes < 5 &&
      (timeLeft.minutes > 0 || timeLeft.seconds > 0) &&
      !hasBeenNotified.current
    ) {
      hasBeenNotified.current = true;

      warningNotification({
        description: t(($) => $.userAccount.session.warning),
      });
    }
  }, [identity, t, timeLeft.minutes, timeLeft.seconds]);

  const handleLogout = () => {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
    clear();
  };

  return (
    <div className="flex flex-col gap-12 pb-20">
      <section className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t(($) => $.userAccount.account)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.accountDescription)}
          </p>
        </div>
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="flex flex-col divide-y">
            <div className="px-6 py-5">
              <PrincipalCard />
            </div>
            <div className="px-6 py-5">
              <AccountIdCard />
            </div>
            <div className="px-6 py-5">
              <ManageIICard />
            </div>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t(($) => $.userAccount.governance.title)}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            {t(($) => $.userAccount.appearance)}
          </h2>
        </div>
        <Card className="p-6 shadow-sm">
          <ThemeCard />
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t(($) => $.userAccount.session.title)}
          </h2>
          {timeLeft.minutes > 0 || timeLeft.seconds > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(($) => $.userAccount.session.timeLeft, {
                minutes: timeLeft.minutes,
                seconds: timeLeft.seconds.toString().padStart(2, '0'),
              })}
            </p>
          ) : null}
        </div>
        {identity && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleLogout}
            className="w-full self-start border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto dark:border-destructive/60 dark:text-destructive-foreground dark:hover:bg-destructive/10"
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
