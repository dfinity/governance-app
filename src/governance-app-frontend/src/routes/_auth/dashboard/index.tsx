import { createFileRoute } from '@tanstack/react-router';

import { AccountCard } from '@features/account/components/AccountCard';
import { SmartTitle } from '@features/dashboard/components/SmartTitle';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 [&>*]:h-full">
        <TotalAssetsCard />
        <AccountCard />
        <div className="md:col-span-2">
          <StakedCard />
        </div>
      </div>
    </div>
  );
}
