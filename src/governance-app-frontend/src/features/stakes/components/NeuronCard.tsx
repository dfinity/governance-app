import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { AlertTriangle, CircleAlert, Coins, Key, PackagePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn } from '@constants/extra';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { useApyColor } from '@hooks/useApyColor';
import { bigIntDiv } from '@utils/bigInt';
import { formatTimestampToLocalDate } from '@utils/date';
import {
  getDissolvingTimeInSeconds,
  getLockedTimeInSeconds,
  getNeuronFreeMaturityE8s,
  getNeuronHasNoFollowing,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
  getNeuronStakeAfterFeesE8s,
  getNeuronStakedMaturityE8s,
  isUserHotkey,
  shortenNeuronId,
} from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { APY } from '@utils/staking-rewards';

import { DisburseIcpModal } from './DisburseIcpModal';
import { DisburseMaturityModal } from './DisburseMaturityModal';
import { NeuronStateBadge } from './NeuronStateBadge';
import { StakeMaturityModal } from './StakeMaturityModal';

type Props = {
  neuron: NeuronInfo;
  apy?: NonNullable<ReturnType<APY['neurons']['get']>>;
};

export const NeuronCard = ({ neuron, apy }: Props) => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const apyColor = useApyColor(apy?.cur ?? 0);
  const { tickerPrices: tickersQuery } = useTickerPrices();
  const [disburseIcpOpen, setDisburseIcpOpen] = useState(false);
  const [disburseMaturityOpen, setDisburseMaturityOpen] = useState(false);
  const [stakeMaturityOpen, setStakeMaturityOpen] = useState(false);

  const isDissolved = getNeuronIsDissolved(neuron);
  const isDissolving = getNeuronIsDissolving(neuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(neuron);
  const hasNoFollowing = getNeuronHasNoFollowing(neuron);
  const hasUnstakedMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;
  const isHotkey = isUserHotkey({
    neuron,
    principalId: identity?.getPrincipal().toText(),
  });

  const dissolveDelaySeconds = isDissolving
    ? getDissolvingTimeInSeconds(neuron)
    : getLockedTimeInSeconds(neuron);

  const durationText = secondsToDuration({
    seconds: dissolveDelaySeconds || 0n,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const creationDate = formatTimestampToLocalDate(neuron.fullNeuron?.createdTimestampSeconds);

  const stakedMaturity = bigIntDiv(getNeuronStakedMaturityE8s(neuron), E8Sn);
  const unstakedMaturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn);
  const stakedAmount = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(stakedAmount * icpPrice.usd) : undefined;

  return (
    <>
      <Card
        className="flex h-full flex-col gap-3 transition-colors hover:border-foreground"
        data-testid="neuron-card"
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" data-testid="neuron-card-staked-amount">
              {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
            </p>
            {tickersQuery.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              usdValue && (
                <p className="text-sm text-muted-foreground">
                  {t(($) => $.account.approxUsd, { value: usdValue })}
                </p>
              )
            )}
          </div>
          {nonNullish(apy) && apyColor.ready && (
            <div
              className="flex items-center gap-2 rounded-sm border p-2"
              style={{
                backgroundColor: apyColor.bgColor,
                borderColor: apyColor.borderColor,
                color: apyColor.textColor,
              }}
              role="button"
              tabIndex={0}
              aria-label="Optimize neuron APY"
            >
              <p className="text-[13px] font-semibold">
                {formatPercentage(apy.cur)}{' '}
                <span className="hidden sm:inline">{t(($) => $.common.apy)} </span>
              </p>
              {apyColor.isMax ? (
                <span className="rounded bg-green-600 px-1 py-0.5 text-[10px] font-bold text-white uppercase">
                  {t(($) => $.common.max)}
                </span>
              ) : (
                <CircleAlert className="hidden size-4 sm:block" />
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">{t(($) => $.neuron.stakeId)}</p>
              <div className="flex items-center gap-2">
                {isHotkey && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex cursor-help items-center gap-1 rounded-sm border border-blue-200 bg-blue-100 px-2 py-0.5 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        data-testid="neuron-hotkey-badge"
                      >
                        <Key className="size-3" aria-hidden="true" />
                        <span className="text-[11px] font-medium">{t(($) => $.neuron.hotkey)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t(($) => $.neuron.hotkeyTooltip)}</TooltipContent>
                  </Tooltip>
                )}
                <p className="text-[15px] font-semibold">{shortenNeuronId(neuron.neuronId)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">{t(($) => $.neuron.created)}</p>
              <p className="text-[15px] font-semibold">{creationDate}</p>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground capitalize">
                {t(($) => $.neuron.dissolveDelay)}
              </p>
              <div className="flex items-center gap-2">
                <NeuronStateBadge isDissolved={isDissolved} isDissolving={isDissolving} />
                <p
                  className="text-[15px] font-semibold capitalize"
                  data-testid="neuron-card-dissolve-delay"
                >
                  {durationText}
                </p>
              </div>
            </div>

            {/* Staked Maturity */}
            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground capitalize">
                {t(($) => $.neuron.stakedMaturity)}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-[15px] font-semibold">{formatNumber(stakedMaturity)}</p>
                <MaturitySymbol />
              </div>
            </div>

            {/* Unstaked Maturity */}
            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground capitalize">
                {t(($) => $.neuron.unstakedMaturity)}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-[15px] font-semibold">{formatNumber(unstakedMaturity)}</p>
                <MaturitySymbol />
              </div>
            </div>

            {/* Maturity Mode */}
            <div className="flex items-center justify-between py-3">
              <p className="text-[13px] text-muted-foreground capitalize">
                {t(($) => $.neuron.maturityMode)}
              </p>
              <p
                className="text-[15px] font-semibold capitalize"
                data-testid="neuron-card-maturity-mode"
              >
                {isAutoStake ? t(($) => $.neuron.autoStake) : t(($) => $.neuron.keepLiquid)}
              </p>
            </div>

            {/* @TODO: Remove when advanced following is implemented */}
            {hasNoFollowing && (
              <div
                className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                data-testid="neuron-card-no-following-warning"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <p className="text-[13px]">{t(($) => $.neuron.noFollowingWarning)}</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Disburse buttons */}
        {!isHotkey && (isDissolved || hasUnstakedMaturity) && (
          <CardFooter className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:gap-4">
            {isDissolved && (
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setDisburseIcpOpen(true);
                }}
                data-testid="neuron-card-disburse-icp-btn"
              >
                <Coins className="size-4" />
                {t(($) => $.neuron.disburseIcp)}
              </Button>
            )}
            {hasUnstakedMaturity && (
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setDisburseMaturityOpen(true);
                }}
                data-testid="neuron-card-disburse-maturity-btn"
              >
                <Coins className="size-4" />
                {t(($) => $.neuron.disburseMaturity)}
              </Button>
            )}
            {hasUnstakedMaturity && !isDissolved && (
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setStakeMaturityOpen(true);
                }}
                data-testid="neuron-card-stake-maturity-btn"
              >
                <PackagePlus className="size-4" />
                {t(($) => $.neuron.stakeMaturity)}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      <DisburseIcpModal
        neuron={neuron}
        isOpen={disburseIcpOpen}
        onOpenChange={setDisburseIcpOpen}
      />
      <DisburseMaturityModal
        neuron={neuron}
        isOpen={disburseMaturityOpen}
        onOpenChange={setDisburseMaturityOpen}
      />
      <StakeMaturityModal
        neuron={neuron}
        isOpen={stakeMaturityOpen}
        onOpenChange={setStakeMaturityOpen}
      />
    </>
  );
};
