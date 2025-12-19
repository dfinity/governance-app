import {
  AccountIdentifier,
  GetAccountIdentifierTransactionsResponse,
} from '@icp-sdk/canisters/ledger/icp';
import { isNullish, nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CreditCard, List } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TransactionListDialog } from '@features/account/components/TransactionListDialog';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { QueryStates } from '@components/QueryStates';
import { SendICPsButton } from '@components/SendICPsButton';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, IS_TESTNET } from '@constants/extra';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { useTickerPrices } from '@hooks/tickers';
import { CertifiedData } from '@typings/queries';
import { TokenPrices } from '@typings/tokenPrices';
import { bigIntDiv } from '@utils/bigInt';

import { GetTokens } from '@/dev/GetTokens';

export function AccountCard() {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const accountId = nonNullish(identity)
    ? AccountIdentifier.fromPrincipal({
        principal: identity.getPrincipal(),
      })
    : null;

  const { tickerPrices } = useTickerPrices();
  const transactions = useIcpIndexTransactions();

  return (
    <Card className="flex-1 gap-3 transition-all duration-300 hover:shadow-[0_0_25px_-5px_rgba(0,0,0,0.25)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.common.accounts)}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        {isNullish(accountId) ? (
          <SkeletonLoader width={100} height={16} />
        ) : (
          <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
            infiniteQuery={transactions}
            isEmpty={(data) => !data.pages?.length}
          >
            {(data) => {
              const balanceICPs = bigIntDiv(data.pages?.[0].response.balance || 0n, E8Sn, 2);
              const numberOfTransactions = data.pages?.[0].response.transactions.length || [];

              return (
                <div className="flex h-full flex-col justify-between">
                  <div className="pb-3">
                    <div className="text-2xl font-bold">
                      {t(($) => $.common.inIcp, { value: balanceICPs })}
                    </div>

                    <QueryStates<TokenPrices>
                      query={tickerPrices}
                      isEmpty={(data) => data.size === 0}
                      loadingComponent={<SkeletonLoader width={50} height={16} />}
                    >
                      {(priceData) => {
                        const icpPrice = priceData.get(CANISTER_ID_ICP_LEDGER!);
                        const usdValue = icpPrice ? (balanceICPs * icpPrice.usd).toFixed(2) : '-';
                        return (
                          <p className="text-xs text-muted-foreground">
                            {t(($) => $.account.approxUsd, { value: usdValue })}
                          </p>
                        );
                      }}
                    </QueryStates>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button size="lg" className="w-full" disabled>
                      <CreditCard /> {t(($) => $.account.buyIcp)}
                    </Button>
                    <div className="flex gap-3">
                      {IS_TESTNET && <GetTokens accountId={accountId} />}

                      <SendICPsButton balance={balanceICPs} />
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <List />
                      {numberOfTransactions} {t(($) => $.common.transactions)}
                    </Button>
                  </div>
                </div>
              );
            }}
          </QueryStates>
        )}
      </CardContent>
      <TransactionListDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </Card>
  );
}
