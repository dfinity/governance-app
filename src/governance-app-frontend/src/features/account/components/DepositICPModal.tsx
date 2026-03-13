import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { CopyButton } from '@components/CopyButton';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { Separator } from '@components/Separator';

import { BuyIcpButton } from './BuyIcpButton';

// Aspect ratio (width / height) of the ICP logo based on the source SVG viewBox (46 x 22).
const QR_CODE_LOGO_ASPECT_RATIO = 46 / 22;
const QR_CODE_LOGO_HEIGHT = 35;
const QR_CODE_LOGO_WIDTH = QR_CODE_LOGO_HEIGHT * QR_CODE_LOGO_ASPECT_RATIO;

type DepositICPModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DepositICPModal = ({ open, onOpenChange }: DepositICPModalProps) => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const accountId = nonNullish(identity)
    ? AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      })
    : null;

  if (!accountId) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0">
          <ResponsiveDialogTitle>{t(($) => $.depositModal.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            {t(($) => $.depositModal.title)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Separator className="shrink-0" />

        <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
          <Alert variant="warning" className="mx-auto max-w-[520px]">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{t(($) => $.depositModal.warning)}</AlertDescription>
          </Alert>

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
            <span className="text-sm font-medium">
              {t(($) => $.depositModal.yourAccountId)}
            </span>
            <div className="flex items-center justify-between gap-4 overflow-hidden rounded-md border bg-muted px-3 py-2">
              <span className="flex-1 text-sm break-all text-muted-foreground">
                {accountId.toHex()}
              </span>
              <CopyButton value={accountId.toHex()} label={t(($) => $.account.accountIdentifier)} />
            </div>
          </div>

          <Separator />

          <p className="text-sm text-muted-foreground">{t(($) => $.depositModal.buyIcpHint)}</p>

          <BuyIcpButton accountId={accountId} />
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
