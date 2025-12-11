import { isNullish, nonNullish } from '@dfinity/utils';
import {
  AccountIdentifier,
  GetAccountIdentifierTransactionsResponse,
} from '@icp-sdk/canisters/ledger/icp';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GetTokens } from '@/dev/GetTokens';
import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { QueryStates } from '@components/QueryStates';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, IS_TESTNET } from '@constants/extra';
import { TransactionListDialog } from '@features/account/components/TransactionListDialog';
import { useIcpIndexTransactions } from '@hooks/icpIndex/useIcpIndexTransactions';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { CertifiedData } from '@typings/queries';
import { TokenPrices } from '@typings/tokenPrices';

import { bigIntDiv } from '@utils/bigInt';
import { List } from 'lucide-react';

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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-semibold uppercase">{t(($) => $.common.accounts)}</CardTitle>
        </CardHeader>

        <CardContent>
          {isNullish(accountId) ? (
            <SkeletonLoader width={100} height={16} />
          ) : (
            <QueryStates<CertifiedData<GetAccountIdentifierTransactionsResponse>>
              infiniteQuery={transactions}
              isEmpty={(data) => !data.pages?.length}
              loadingComponent={<SkeletonLoader width={100} height={32} />}
            >
              {(data) => {
                const balanceICPs = bigIntDiv(data.pages?.[0].response.balance || 0n, E8Sn, 2);
                const numberOfTransactions = data.pages?.[0].response.transactions.length || [];

                return (
                  <div className="flex flex-col gap-1">
                    <div>
                      <div className="text-2xl font-bold">{balanceICPs} ICP</div>

                      <QueryStates<TokenPrices>
                        query={tickerPrices}
                        isEmpty={(data) => data.size === 0}
                        loadingComponent={<SkeletonLoader width={50} height={16} />}
                      >
                        {(priceData) => {
                          const icpPrice = priceData.get(CANISTER_ID_ICP_LEDGER!);
                          const usdValue = icpPrice ? (balanceICPs * icpPrice.usd).toFixed(2) : '-';
                          return <p className="text-xs text-muted-foreground">≈ ${usdValue} USD</p>;
                        }}
                      </QueryStates>
                    </div>
                    <div>
                      {IS_TESTNET && (
                        <div className="mt-4">
                          <GetTokens accountId={accountId} />
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="mt-2 w-full"
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
      </Card>

      <TransactionListDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
