import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@features/account/components/AccountCard';

import { Button } from '@components/button';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { t } = useTranslation();
  const { identity, login } = useInternetIdentity();

  return (
    <div className="flex flex-col gap-4">
      {identity ? (
        <AccountCard />
      ) : (
        <Button onClick={login} variant="outline" size="lg">
          {t(($) => $.common.login)}
        </Button>
      )}
    </div>
  );
}
