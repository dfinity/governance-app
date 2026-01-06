import { createFileRoute } from '@tanstack/react-router';

import { AccountCard } from '@features/account/components/AccountCard';
import { TotalAssetsCard } from '@features/dashboard/components/TotalAssetsCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
  staticData: {
    title: 'common.dashboard',
  },
});

function Homepage() {
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
