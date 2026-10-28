import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, CircleAlert, Coins, Hourglass, Key, PackagePlus, Usb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@components/Card';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { SensitiveValue } from '@components/SensitiveValue';
import { Skeleton } from '@components/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { E8Sn } from '@constants/extra';
import { useIcpPrice } from '@hooks/tickers';
import { useApyColor } from '@hooks/useApyColor';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { bigIntDiv } from '@utils/bigInt';
import { formatTimestampToLocalDate } from '@utils/date';
import {
  formatDissolveDelay,
  getDissolvingTimeInSeconds,
  getEightYearGangBonusE8s,
  getLockedTimeInSeconds,
  getNeuronFreeMaturityE8s,
  getNeuronHasNoFollowing,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
  getNeuronMaturityDisbursementsInProgress,
  getNeuronMaturityDisbursementsInProgressE8s,
  getNeuronStakeAfterFeesE8s,
  getNeuronStakedMaturityE8s,
  isUserHotkeyOnly,
  shortenNeuronId,
} from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { APY } from '@utils/staking-rewards';

import { useNeuronLedgerDevice } from '../hooks/useNeuronLedgerDevice';
import { useLedgerSignerPrincipals } from '../hooks/useNeuronSigner';
import { FollowingStatusBadge } from './FollowingStatusBadge';
import type { NeuronAction } from './neuronDetail';
import { NeuronStandaloneAction } from './neuronDetail';
import { NeuronStateBadge } from './NeuronStateBadge';

type Props = {
  neuron: NeuronInfo;
  apy?: NonNullable<ReturnType<APY['neurons']['get']>>;
  onAction?: (action: NeuronAction) => void;
};

export const NeuronCard = ({ neuron, apy, onAction }: Props) => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const apyColor = useApyColor(apy?.cur ?? 0);
  const { icpPrice, formatFiat, isLoading: isIcpPriceLoading } = useIcpPrice();
  const ledgerDevice = useNeuronLedgerDevice(neuron);
  const ledgerPrincipals = useLedgerSignerPrincipals();

  const isDissolved = getNeuronIsDissolved(neuron);
  const isDissolving = getNeuronIsDissolving(neuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(neuron);
  const hasNoFollowing = getNeuronHasNoFollowing(neuron);
  const hasUnstakedMaturity = getNeuronFreeMaturityE8s(neuron) > 0n;
  const hasStakeToDisburse = getNeuronStakeAfterFeesE8s(neuron) > 0n;
  const isEightYearGang = getEightYearGangBonusE8s(neuron, new Date()) > 0n;
  // Hotkey access only: a neuron that a usable Ledger device controls keeps its actions.
  const isHotkey = isUserHotkeyOnly({
    neuron,
    principalId: identity?.getPrincipal().toText(),
    ledgerPrincipals,
  });

  const dissolveDelaySeconds = isDissolving
    ? getDissolvingTimeInSeconds(neuron)
    : getLockedTimeInSeconds(neuron);

  const durationText = formatDissolveDelay({
    seconds: dissolveDelaySeconds || 0n,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const creationDate = formatTimestampToLocalDate(neuron.fullNeuron?.createdTimestampSeconds);

  const stakedMaturity = bigIntDiv(getNeuronStakedMaturityE8s(neuron), E8Sn);
  const unstakedMaturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn);
  const hasDisbursementsInProgress = getNeuronMaturityDisbursementsInProgress(neuron).length > 0;
  const disbursingMaturity = bigIntDiv(getNeuronMaturityDisbursementsInProgressE8s(neuron), E8Sn);
  const stakedAmount = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);

  const fiatValue = nonNullish(icpPrice) ? formatFiat(stakedAmount * icpPrice) : undefined;
  const showApy = nonNullish(apy) && apyColor.ready;

  return (
    <>
      <Card
        className="@container/neuron-card flex h-full flex-col gap-3 transition-colors hover:border-foreground"
        data-testid="neuron-card"
      >
        {/* The tags (device, hotkey, 8-year gang, APY) share one cluster. Narrow cards show
            the fiat value and the tags on one line below the amount. */}
        <CardHeader className="flex flex-wrap items-center justify-between space-y-0 gap-x-3 gap-y-1 @md/neuron-card:items-start @md/neuron-card:gap-y-3">
          <div className="contents @md/neuron-card:flex @md/neuron-card:flex-col @md/neuron-card:gap-1">
            <p
              className="basis-full text-3xl font-bold whitespace-nowrap @md/neuron-card:basis-auto"
              data-testid="neuron-card-staked-amount"
            >
              <SensitiveValue>
                {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
              </SensitiveValue>
            </p>
            {isIcpPriceLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              fiatValue && (
                <p className="text-sm text-muted-foreground">
                  <SensitiveValue size="sm">
                    {t(($) => $.account.approxFiat, { value: fiatValue })}
                  </SensitiveValue>
                </p>
              )
            )}
          </div>
          {(ledgerDevice || isHotkey || showApy) && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
              {ledgerDevice && (
                <Badge
                  variant="outline"
                  title={ledgerDevice.name}
                  data-testid="neuron-ledger-device-badge"
                >
                  <Usb aria-hidden="true" />
                  {t(($) => $.neuron.ledgerDevice)}
                </Badge>
              )}
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
              {showApy && isEightYearGang && (
                <div className="rounded-sm border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 @md/neuron-card:p-2">
                  <p className="text-[11px] font-bold whitespace-nowrap text-foreground uppercase @md/neuron-card:text-[13px]">
                    {t(($) => $.neuron.eightYearGang)}
                  </p>
                </div>
              )}
              {showApy && (
                <div
                  className="flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 @md/neuron-card:gap-2 @md/neuron-card:p-2"
                  style={{
                    backgroundColor: apyColor.bgColor,
                    borderColor: apyColor.borderColor,
                    color: apyColor.textColor,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Optimize neuron APY"
                >
                  <p className="text-xs font-semibold @md/neuron-card:text-[13px]">
                    {formatPercentage(apy.cur)}
                  </p>
                  {apyColor.isMax ? (
                    <span className="rounded bg-green-600 px-1 text-[10px] font-bold text-white uppercase @md/neuron-card:py-0.5">
                      {t(($) => $.common.max)}
                    </span>
                  ) : (
                    <CircleAlert className="hidden size-3.5 sm:block @md/neuron-card:size-4" />
                  )}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">{t(($) => $.neuron.stakeId)}</p>
              <div className="flex items-center gap-2">
                <FollowingStatusBadge neuron={neuron} />
                <p className="text-[15px] font-semibold">{shortenNeuronId(neuron.neuronId)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">{t(($) => $.neuron.created)}</p>
              <p className="text-[15px] font-semibold">{creationDate}</p>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">
                {t(($) => $.neuron.dissolveDelay)}
              </p>
              <div className="flex items-center gap-2">
                <NeuronStateBadge isDissolved={isDissolved} isDissolving={isDissolving} />
                <p className="text-[15px] font-semibold" data-testid="neuron-card-dissolve-delay">
                  {durationText}
                </p>
              </div>
            </div>

            {/* Staked Maturity */}
            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">
                {t(($) => $.neuron.stakedMaturity)}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-[15px] font-semibold">{formatNumber(stakedMaturity)}</p>
                <MaturitySymbol />
              </div>
            </div>

            {/* Unstaked Maturity */}
            <div className="flex items-center justify-between border-b border-border/50 py-3">
              <p className="text-[13px] text-muted-foreground">
                {t(($) => $.neuron.unstakedMaturity)}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-[15px] font-semibold">{formatNumber(unstakedMaturity)}</p>
                <MaturitySymbol />
              </div>
            </div>

            {/* Disbursing Maturity */}
            {hasDisbursementsInProgress && (
              <div
                className="flex items-center justify-between border-b border-border/50 py-3"
                data-testid="neuron-card-disbursing-maturity"
              >
                <p className="text-[13px] text-muted-foreground">
                  {t(($) => $.neuron.disbursingMaturity)}
                </p>
                <div className="flex items-center gap-1">
                  <Hourglass className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <p className="text-[15px] font-semibold">{formatNumber(disbursingMaturity)}</p>
                  <MaturitySymbol />
                </div>
              </div>
            )}

            {/* Maturity Mode */}
            <div className="flex items-center justify-between py-3">
              <p className="text-[13px] text-muted-foreground">{t(($) => $.neuron.maturityMode)}</p>
              <p
                className="text-[15px] font-semibold"
                data-testid={
                  isAutoStake
                    ? 'neuron-card-maturity-auto-stake'
                    : 'neuron-card-maturity-keep-liquid'
                }
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
        {!isHotkey && ((isDissolved && hasStakeToDisburse) || hasUnstakedMaturity) && (
          <CardFooter className="flex flex-col gap-3 border-t pt-4 @md/neuron-card:flex-row @md/neuron-card:gap-4">
            {isDissolved && hasStakeToDisburse && (
              <Button
                variant="outline"
                className="w-full @md/neuron-card:flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(NeuronStandaloneAction.DisburseIcp);
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
                className="w-full @md/neuron-card:flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(NeuronStandaloneAction.DisburseMaturity);
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
                className="w-full @md/neuron-card:flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(NeuronStandaloneAction.StakeMaturity);
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
    </>
  );
};
