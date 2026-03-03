import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@features/account/components/AccountCard';
import { DepositICPModal } from '@features/account/components/DepositICPModal';
import { DailyRewardsCard } from '@features/dashboard/components/DailyRewardsCard';
import { ExecutiveSummaryCard } from '@features/dashboard/components/ExecutiveSummaryCard';
import { IcpPriceCard } from '@features/dashboard/components/IcpPriceCard';
import { MaxApyCard } from '@features/dashboard/components/MaxApyCard';
import { SmartTitle } from '@features/dashboard/components/SmartTitle';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { TotalStakedCard } from '@features/dashboard/components/TotalStakedCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

import i18n from '@/i18n/config';

type DashboardSearchParams = {
  depositModal?: boolean;
};

export const Route = createFileRoute('/_auth/dashboard/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearchParams => ({
    depositModal: search.depositModal === 'true' || search.depositModal === true ? true : undefined,
  }),
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
  const navigate = useNavigate({ from: Route.fullPath });
  const { depositModal } = Route.useSearch();

  const handleDepositModalOpenChange = (isOpen: boolean) => {
    if (!isOpen) navigate({ search: {}, replace: true });
  };

  useEffect(() => {
    document.documentElement.classList.add('route-dashboard');
    return () => document.documentElement.classList.remove('route-dashboard');
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <SmartTitle />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TotalAssetsCard />
        <AccountCard />
        <div className="md:col-span-2">
          <StakedCard />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <h2 className="text-2xl font-medium tracking-wide capitalize">
          {t(($) => $.home.governanceOverview)}
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <TotalStakedCard />
          <DailyRewardsCard />
          <IcpPriceCard />
          <MaxApyCard />
        </div>
        <ExecutiveSummaryCard />
      </div>

      <DepositICPModal open={!!depositModal} onOpenChange={handleDepositModalOpenChange} />
    </div>
  );
}
