import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { CreditCard, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@components/AlertDialog';
import { Button } from '@components/button';
import { CopyButton } from '@components/CopyButton';

const BASE_URL = 'https://checkout.banxa.com/';

const staticQueryParams = {
  fiatAmount: 100,
  fiatType: 'USD',
  coinType: 'ICP',
  orderMode: 'BUY',
  backgroundColor: '2a1a47',
  primaryColor: '9b6ef7',
  secondaryColor: '8b55f6',
  textColor: 'ffffff',
};

const buildBuyIcpUrl = (accountId: AccountIdentifier): string => {
  const queryParams = {
    ...staticQueryParams,
    walletAddress: accountId.toHex(),
  };
  return `${BASE_URL}?${Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
};

type Props = {
  accountId: AccountIdentifier;
};

export const BuyIcpButton = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const buyUrl = buildBuyIcpUrl(accountId);

  return (
    <>
      <Button size="xl" variant="secondary" className="w-full" onClick={() => setConfirmOpen(true)}>
        <CreditCard aria-hidden="true" />
        {t(($) => $.account.buyIcp)}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[60]">
          <AlertDialogHeader className="relative">
            <AlertDialogCancel
              className="absolute top-0 right-0 size-8 rounded-xs border-none bg-transparent p-0 opacity-70 shadow-none ring-offset-background transition-opacity hover:bg-transparent hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={t(($) => $.common.close)}
            >
              <X className="size-4" />
            </AlertDialogCancel>
            <AlertDialogTitle>{t(($) => $.depositModal.buyIcp.title)}</AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-4">
              <p className="text-left">{t(($) => $.depositModal.buyIcp.description)}</p>

              <Alert variant="warning">
                <AlertDescription>{t(($) => $.depositModal.buyIcp.disclaimer)}</AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <span className="text-base font-medium text-primary">
                  {t(($) => $.depositModal.buyIcp.receivingAddress)}
                </span>
                <div className="flex items-center justify-between gap-4 overflow-hidden rounded-md border bg-muted px-3 py-2">
                  <span className="flex-1 text-sm break-all text-muted-foreground">
                    {accountId.toHex()}
                  </span>
                  <CopyButton
                    value={accountId.toHex()}
                    label={t(($) => $.account.accountIdentifier)}
                  />
                </div>
              </div>
            </div>
          </AlertDialogDescription>

          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <a href={buyUrl} target="_blank" rel="noopener noreferrer">
                <CreditCard aria-hidden="true" />
                {t(($) => $.depositModal.buyIcp.proceed)}
                <span className="sr-only">{t(($) => $.common.opensInNewTab)}</span>
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
