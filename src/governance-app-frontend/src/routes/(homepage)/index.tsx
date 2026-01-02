import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { AccountCard } from '@features/account/components/AccountCard';
import { ParticipateCard } from '@features/dashboard/components/ParticipateCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
  staticData: {
    title: 'common.dashboard',
  },
});

function Homepage() {
  const { identity } = useInternetIdentity();

  if (!identity) return null;

  return (
    <div className="flex flex-col gap-6">
      <ParticipateCard />
      <div className="flex flex-col gap-6 md:flex-row">
        <AccountCard />
        <StakedCard />
      </div>
    </div>
  );
}
