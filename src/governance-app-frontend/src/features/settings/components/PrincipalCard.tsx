import { useInternetIdentity } from 'ic-use-internet-identity';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@components/button';
import { Card, CardContent } from '@components/Card';

const PrincipalCard = () => {
  const { identity } = useInternetIdentity();
  const copyPrincipal = () => {
    if (identity) {
      navigator.clipboard.writeText(identity.getPrincipal().toText());
      toast.success('Principal ID copied to clipboard');
    }
  };

  return (
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
  );
};
export { PrincipalCard };
