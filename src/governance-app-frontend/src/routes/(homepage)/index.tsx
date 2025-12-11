import { createFileRoute } from '@tanstack/react-router';

import { AccountCard } from '@features/account/components/AccountCard';

export const Route = createFileRoute('/(homepage)/')({
  component: Homepage,
});

function Homepage() {
  return (
    <div className="flex flex-col gap-4">
      <AccountCard />
    </div>
  );
}
