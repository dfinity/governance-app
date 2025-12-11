import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@components/button';
import { Card, CardContent } from '@components/Card';
import { cn } from '@utils/shadcn';

const PrincipalCard = () => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  const copyPrincipal = () => {
    if (identity) {
      navigator.clipboard.writeText(identity.getPrincipal().toText());
      setIsCopied(true);
    }
  };

  return (
    <Card className="rounded-md px-4 py-6">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="leading-none font-medium">{t(($) => $.settings.principalId)}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {identity ? identity.getPrincipal().toText() : t(($) => $.settings.notConnected)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className={cn(
                'transition-colors duration-200',
                isCopied && 'border-green-600 bg-green-50 text-green-600 dark:bg-green-900',
              )}
              variant="outline"
              size="icon-lg"
              onClick={copyPrincipal}
              disabled={!identity}
            >
              <div className="relative flex items-center justify-center">
                <Copy
                  className={cn(
                    'absolute size-5 transition-all duration-300',
                    isCopied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
                  )}
                />
                <Check
                  className={cn(
                    'size-5 transition-all duration-300',
                    isCopied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                  )}
                />
              </div>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export { PrincipalCard };
