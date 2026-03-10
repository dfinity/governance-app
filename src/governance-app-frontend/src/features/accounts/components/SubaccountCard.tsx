import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader } from '@components/Card';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';

import type { Subaccount } from '../data/mockSubaccounts';

type Props = {
  account: Subaccount;
};

export const SubaccountCard = ({ account }: Props) => {
  const { t } = useTranslation();
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const balanceICP = bigIntDiv(account.balanceE8s, E8Sn);
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(balanceICP * icpPrice.usd) : '-';

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">{account.name}</p>
        <div className="flex flex-col gap-0.5">
          <p className="text-2xl font-bold">
            {t(($) => $.common.inIcp, { value: formatNumber(balanceICP) })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.account.approxUsd, { value: usdValue })}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Subaccount #{account.subaccountIndex}
        </p>
      </CardContent>
    </Card>
  );
};
