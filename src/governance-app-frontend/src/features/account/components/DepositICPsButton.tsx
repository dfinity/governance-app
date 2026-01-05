import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Check, Copy, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { successNotification } from '@utils/notification';
import { cn } from '@utils/shadcn';

type Props = {
  accountId: AccountIdentifier;
};

export const DepositICPsButton = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(accountId.toHex());
    setIsCopied(true);
    successNotification({
      description: t(($) => $.common.copiedToClipboard, {
        label: t(($) => $.depositModal.yourAccountId),
      }),
    });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline" size="lg" className="flex-1">
          <Download />
          {t(($) => $.common.deposit)}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="lg:min-w-[640px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.depositModal.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {t(($) => $.depositModal.title)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t(($) => $.depositModal.yourAccountId)}
            </span>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 overflow-hidden rounded-md border bg-muted px-3 py-2 text-sm break-all text-ellipsis text-muted-foreground"
                title={accountId.toHex()}
              >
                {accountId.toHex()}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={isCopied}
                className={cn(
                  'shrink-0 transition-colors duration-200',
                  isCopied && 'border-green-600 bg-green-50 text-green-600 dark:bg-green-900',
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Copy
                    className={cn(
                      'absolute size-4 transition-all duration-300',
                      isCopied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
                    )}
                  />
                  <Check
                    className={cn(
                      'size-4 transition-all duration-300',
                      isCopied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                    )}
                  />
                </div>
              </Button>
            </div>
          </div>

          <Alert variant="warning">
            <AlertTitle>{t(($) => $.common.warning)}</AlertTitle>
            <AlertDescription>{t(($) => $.depositModal.warning)}</AlertDescription>
          </Alert>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
