import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Plus } from 'lucide-react';
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

// Aspect ratio (width / height) of the ICP logo based on the source SVG asset.
const QR_CODE_LOGO_ASPECT_RATIO = 464 / 272;
const QR_CODE_LOGO_HEIGHT = 35;
const QR_CODE_LOGO_WIDTH = QR_CODE_LOGO_HEIGHT * QR_CODE_LOGO_ASPECT_RATIO;

export const DepositICPButton = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button size="xl" className="w-full">
          <Plus aria-hidden="true" />
          {t(($) => $.account.addIcp)}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.depositModal.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {t(($) => $.depositModal.title)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="mt-4 flex flex-col gap-4 pb-4 lg:pb-0">
          <div className="flex justify-center p-4">
            <div className="rounded-lg border p-4">
              <QRCodeSVG
                value={accountId.toHex()}
                size={220}
                level="H"
                imageSettings={{
                  src: '/governance-logo.svg',
                  height: QR_CODE_LOGO_HEIGHT,
                  width: QR_CODE_LOGO_WIDTH,
                  excavate: true,
                }}
                role="img"
                aria-label={t(($) => $.depositModal.qrCodeLabel)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium capitalize">
              {t(($) => $.depositModal.yourAccountId)}
            </span>
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
