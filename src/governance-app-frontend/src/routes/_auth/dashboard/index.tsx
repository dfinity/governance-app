import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@features/account/components/AccountCard';
import { DepositICPModal } from '@features/account/components/DepositICPModal';
import { SendICPDialog } from '@features/account/components/SendICPButton';
import { AccountsCard } from '@features/accounts/components/AccountsCard';
import { DailyRewardsCard } from '@features/dashboard/components/DailyRewardsCard';
import { ExecutiveSummaryCard } from '@features/dashboard/components/ExecutiveSummaryCard';
import { IcpPriceCard } from '@features/dashboard/components/IcpPriceCard';
import { MaxApyCard } from '@features/dashboard/components/MaxApyCard';
import { SmartTitle } from '@features/dashboard/components/SmartTitle';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { TotalStakedCard } from '@features/dashboard/components/TotalStakedCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

import { DashboardSkeleton } from '@components/skeletons/DashboardSkeleton';
import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { isAccountsAreaEnabled } from '@utils/advancedFeatures';
import { bigIntDiv } from '@utils/bigInt';
import { prefetchDashboardRoute } from '@common/queries/routeLoaders';

import i18n from '@/i18n/config';

type DashboardSearchParams = {
  depositModal?: boolean;
  sendModal?: boolean;
};

const isTrue = (value: unknown) => (value === 'true' || value === true ? true : undefined);

export const Route = createFileRoute('/_auth/dashboard/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearchParams => ({
    depositModal: isTrue(search.depositModal),
    sendModal: isTrue(search.sendModal),
  }),
  loader: ({ context }) => prefetchDashboardRoute(context.queryClient),
  pendingComponent: DashboardPending,
  // Entry only — `?depositModal` and `?sendModal` toggles must not rerun the loader.
  staleTime: Infinity,
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

function DashboardPending() {
  const { features } = useAdvancedFeatures();

  return <DashboardSkeleton subaccounts={isAccountsAreaEnabled(features)} />;
}

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const { depositModal, sendModal } = Route.useSearch();
  const { features } = useAdvancedFeatures();
  const accountsEnabled = isAccountsAreaEnabled(features);
  const balanceQuery = useIcpLedgerAccountBalance();
  const mainBalance = bigIntDiv(balanceQuery.data?.response || 0n, E8Sn);

  const handleModalOpenChange = (isOpen: boolean) => {
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
        {accountsEnabled ? <AccountsCard /> : <AccountCard />}
        <div className="md:col-span-2">
          <StakedCard />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <h2 className="text-3xl font-normal tracking-tight">
          {t(($) => $.home.governanceOverview)}
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TotalStakedCard />
          <DailyRewardsCard />
          <IcpPriceCard />
          <MaxApyCard />
        </div>
        <ExecutiveSummaryCard />
      </div>

      <DepositICPModal open={!!depositModal} onOpenChange={handleModalOpenChange} />
      <SendICPDialog
        open={!!sendModal}
        onOpenChange={handleModalOpenChange}
        balance={mainBalance}
      />
    </div>
  );
}
