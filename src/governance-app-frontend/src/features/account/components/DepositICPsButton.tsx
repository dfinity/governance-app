import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { CopyButton } from '@components/CopyButton';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';

type Props = {
  accountId: AccountIdentifier;
};

const SVG_HEIGHT = 35;
const SVG_WIDTH = SVG_HEIGHT * 1.9;

export const DepositICPsButton = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline" size="lg" className="flex-1">
          <Download />
          {t(($) => $.common.deposit)}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.depositModal.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {t(($) => $.depositModal.title)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex justify-center p-4">
            <div className="rounded-lg border bg-white p-4">
              <QRCodeSVG
                value={accountId.toHex()}
                size={220}
                level="H"
                imageSettings={{
                  src: '/icp-logo.svg',
                  height: SVG_HEIGHT,
                  width: SVG_WIDTH,
                  excavate: true,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t(($) => $.depositModal.yourAccountId)}</span>
            <div className="flex items-center justify-between gap-4 overflow-hidden rounded-md border bg-muted px-3 py-2">
              <span className="flex-1 text-sm break-all text-muted-foreground">
                {accountId.toHex()}
              </span>
              <CopyButton value={accountId.toHex()} label={t(($) => $.account.accountIdentifier)} />
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
