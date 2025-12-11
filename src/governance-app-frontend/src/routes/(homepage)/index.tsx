import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { AccountCard } from '@features/account/components/AccountCard';
import { StakedCard } from '@features/stakes/components/StakedCard';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();

  if (!identity) return null;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex gap-4">
        <AccountCard />
        <StakedCard />
      </div>
    </div>
  );
}
