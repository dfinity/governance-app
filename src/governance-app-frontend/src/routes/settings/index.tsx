import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';

import { Button } from '@/common/components/button';
import { PrincipalCard } from '@/features/settings/components/PrincipalCard';
import { ThemeCard } from '@/features/settings/components/ThemeCard';

export const Route = createFileRoute('/settings/')({
  component: Settings,
});

function Settings() {
  const { identity, clear } = useInternetIdentity();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="mb-2 text-sm leading-relaxed font-semibold tracking-wider text-gray-500 uppercase">
          General
        </h2>
        <ThemeCard />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="mb-2 text-sm leading-relaxed font-semibold tracking-wider text-gray-500 uppercase">
          Account
        </h2>
        <PrincipalCard />
      </section>

      <Button variant="destructive" size="lg" onClick={clear} disabled={!identity}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
