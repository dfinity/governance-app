import { createFileRoute } from '@tanstack/react-router';

import { AccountCard } from '@features/account/components/AccountCard';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { StakedCard } from '@features/stakes/components/StakedCard';
import { useIcpIndexTransactionsPolling } from '@hooks/icpIndex/useIcpIndexTransactionsPolling';

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
  useIcpIndexTransactionsPolling();

  return (
    <div className="flex flex-col gap-6">
      <TotalAssetsCard />
      <div className="flex flex-col gap-6 md:flex-row">
        <AccountCard />
        <StakedCard />
      </div>
    </div>
  );
}
