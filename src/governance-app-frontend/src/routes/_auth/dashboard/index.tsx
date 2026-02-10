import { createFileRoute } from '@tanstack/react-router';

import { AccountCard } from '@features/account/components/AccountCard';
import { SmartTitle } from '@features/dashboard/components/SmartTitle';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { StakedCardLegacy } from '@features/stakes/components/StakedCard';

import i18n from '@/i18n/config';

export const Route = createFileRoute('/_auth/dashboard/')({
  component: Dashboard,
  head: () => {
    const title = i18n.t(($) => $.common.head.dashboard.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.dashboard',
  },
});

function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <SmartTitle />

      <div className="flex flex-col gap-6 md:flex-row">
        <TotalAssetsCard />
        <AccountCard />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <StakedCardLegacy />
      </div>
    </div>
  );
}
