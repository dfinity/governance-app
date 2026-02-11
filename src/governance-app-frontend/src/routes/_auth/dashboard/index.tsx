import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@features/account/components/AccountCard';
import { DepositICPModal } from '@features/account/components/DepositICPButton';
import { DailyRewardsCard } from '@features/dashboard/components/DailyRewardsCard';
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
    navigate({
      search: isOpen ? { depositModal: true } : {},
      replace: true,
    });
  };

  return (
    <div className="relative isolate flex flex-col gap-8">
      {/* Decorative gradient orbs — top-right corner */}
      <div
        className="pointer-events-none absolute -top-[200px] -right-[180px] -z-10 h-[493px] w-[492px] rounded-full bg-[#3B82F6] opacity-30 blur-[200px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-[140px] -right-[420px] -z-10 h-[493px] w-[492px] rounded-full bg-[#EA580C] opacity-30 blur-[200px]"
        aria-hidden="true"
      />

      <SmartTitle />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3">
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TotalStakedCard />
          <DailyRewardsCard />
          <IcpPriceCard />
          <MaxApyCard />
        </div>
      </div>

      <DepositICPModal open={!!depositModal} onOpenChange={handleDepositModalOpenChange} />
    </div>
  );
}
