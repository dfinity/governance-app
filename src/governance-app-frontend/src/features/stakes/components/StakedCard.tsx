import { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { Coins, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { QueryStates } from '@components/QueryStates';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { CertifiedData } from '@typings/queries';
import { TokenPrices } from '@typings/tokenPrices';

export function StakedCard() {
  const { t } = useTranslation();
  const neuronsQuery = useGovernanceNeurons();
  const { tickerPrices } = useTickerPrices();

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium tracking-wide text-muted-foreground uppercase">
          {t(($) => $.common.staked)}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <QueryStates<CertifiedData<NeuronInfo[]>>
          query={neuronsQuery}
          isEmpty={(neurons) => neurons.response.length === 0}
        >
          {(neurons) => {
            const totalStaked = neurons.response.reduce((acc, neuron) => {
              const stake = Number(neuron.fullNeuron?.cachedNeuronStake) / E8S;
              return acc + stake;
            }, 0);

            return (
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="text-2xl font-bold">{totalStaked} ICP</div>

                  <QueryStates<TokenPrices>
                    query={tickerPrices}
                    isEmpty={(data) => data.size === 0}
                    loadingComponent={<SkeletonLoader width={50} height={16} />}
                  >
                    {(priceData) => {
                      const icpPrice = priceData.get(CANISTER_ID_ICP_LEDGER!);
                      const usdValue = icpPrice
                        ? (Number(totalStaked) * icpPrice.usd).toFixed(2)
                        : '-';
                      return <p className="text-xs text-muted-foreground">≈ ${usdValue} USD</p>;
                    }}
                  </QueryStates>
                </div>

                <div className="flex gap-3">
                  <Button size="lg" className="pointer-events-none flex-1" asChild>
                    <Link to="/">
                      <TrendingUp /> Stake More
                    </Link>
                  </Button>

                  <Button size="lg" variant="outline" className="pointer-events-none flex-1">
                    <Coins /> Withdraw
                  </Button>
                </div>
              </div>
            );
          }}
        </QueryStates>
      </CardContent>
    </Card>
  );
}
