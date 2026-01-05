import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

const BASE_URL = 'https://checkout.banxa.com/';

const staticQueryParams = {
  fiatAmount: 100,
  fiatType: 'USD',
  coinAmount: 0.00244394,
  coinType: 'ICP',
  lockFiat: 'true',
  blockchain: 'ICP',
  orderMode: 'BUY',
  backgroundColor: '2a1a47',
  primaryColor: '9b6ef7',
  secondaryColor: '8b55f6',
  textColor: 'ffffff',
};

type Props = {
  accountId: AccountIdentifier;
};

export const BuyIcpsButton = ({ accountId }: Props) => {
  const { t } = useTranslation();

  const queryParams = {
    ...staticQueryParams,
    walletAddress: accountId.toHex(),
  };
  const url = `${BASE_URL}?${Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;

  return (
    <Button size="lg" className="w-full" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <CreditCard /> {t(($) => $.account.buyIcp)}
      </a>
    </Button>
  );
};
