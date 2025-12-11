import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';

import { AccountCard } from '@features/account/components/AccountCard';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  const { identity } = useInternetIdentity();

  return <div className="flex flex-col gap-4">{identity && <AccountCard />}</div>;
}
