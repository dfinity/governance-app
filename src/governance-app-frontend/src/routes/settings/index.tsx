import { createFileRoute } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { Copy, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/common/components/button';
import { Card, CardContent } from '@/common/components/Card';
import { ThemeCard } from '@/features/settings/components/ThemeCard';

export const Route = createFileRoute('/settings/')({
  component: Settings,
});

function Settings() {
  const { identity, clear } = useInternetIdentity();

  const copyPrincipal = () => {
    if (identity) {
      navigator.clipboard.writeText(identity.getPrincipal().toText());
      toast.success('Principal ID copied to clipboard');
    }
  };

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
        <Card className="rounded-md px-4 py-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="leading-none font-medium">Principal ID</p>
                <p className="font-mono text-sm text-muted-foreground">
                  {identity ? identity.getPrincipal().toText() : 'Not connected'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyPrincipal} disabled={!identity}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Button variant="destructive" size="lg" onClick={clear} disabled={!identity}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
