import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@features/account/components/AccountCard';
import { DailyRewardsCard } from '@features/dashboard/components/DailyRewardsCard';
import { IcpPriceCard } from '@features/dashboard/components/IcpPriceCard';
import { MaxApyCard } from '@features/dashboard/components/MaxApyCard';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { TotalStakedCard } from '@features/dashboard/components/TotalStakedCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

import i18n from '@/i18n/config';
import { SmartTitle } from '@features/dashboard/components/SmartTitle';

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
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8">
      <SmartTitle />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 [&>*]:h-full">
        <TotalAssetsCard />
        <AccountCard />
        <div className="md:col-span-2">
          <StakedCard />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-medium tracking-wide capitalize">
          {t(($) => $.home.governanceOverview)}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TotalStakedCard />
          <DailyRewardsCard />
          <IcpPriceCard />
          <MaxApyCard />
        </div>
      </div>
    </div>
  );
}
