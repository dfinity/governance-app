import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { Clock, Key, Lock, PlusCircle, Settings, Unlock, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getFollowableTopicFolloweesMap,
  getSingleUniformFollowee,
  resolveFolloweeNames,
} from '@features/voting/utils/topicFollowing';

import { Button } from '@components/button';
import { CopyButton } from '@components/CopyButton';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, IS_TESTNET } from '@constants/extra';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { useTickerPrices } from '@hooks/tickers/useTickerPrices';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useApyColor } from '@hooks/useApyColor';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { bigIntDiv } from '@utils/bigInt';
import { formatTimestampToLocalDate } from '@utils/date';
import {
  getNeuronFreeMaturityE8s,
  getNeuronStakeAfterFeesE8s,
  getNeuronStakedMaturityE8s,
  shortenNeuronId,
} from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { NeuronStateBadge } from '../NeuronStateBadge';
import { NeuronDetailFollowingDialog } from './NeuronDetailFollowingDialog';
import { NeuronDetailView } from './types';

type Props = {
  neuron: NeuronInfo;
  apy: { cur: number; max: number } | undefined;
  isApyLoading: boolean;
  isDissolved: boolean;
  isDissolving: boolean;
  isAutoStake: boolean;
  isHotkey: boolean;
  onNavigate: (view: NeuronDetailView) => void;
};

export function NeuronDetailSummaryView({
  neuron,
  apy,
  isApyLoading,
  isDissolved,
  isDissolving,
  isAutoStake,
  isHotkey,
  onNavigate,
}: Props) {
  const { t } = useTranslation();
  const apyColor = useApyColor(apy?.cur ?? 0);
  const { tickerPrices: tickersQuery } = useTickerPrices();

  const stakedAmount = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);
  const stakedMaturity = bigIntDiv(getNeuronStakedMaturityE8s(neuron), E8Sn);
  const unstakedMaturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn);

  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);
  const usdValue = icpPrice ? formatNumber(stakedAmount * icpPrice.usd) : undefined;

  const dissolveDelaySeconds = neuron.dissolveDelaySeconds;
  const durationText = secondsToDuration({
    seconds: dissolveDelaySeconds || 0n,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  const creationDate = formatTimestampToLocalDate(neuron.fullNeuron?.createdTimestampSeconds);

  const { features } = useAdvancedFeatures();
  const isAdvancedFollowing = features[AdvancedFeature.AdvancedFollowing];

  const knownNeuronsQuery = useGovernanceKnownNeurons();
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];

  const followeesMap = getFollowableTopicFolloweesMap(neuron);
  const hasFollowees = Array.from(followeesMap.values()).some((ids) => ids.length > 0);

  const uniformFollowee = getSingleUniformFollowee(followeesMap);
  const followeeName = uniformFollowee
    ? resolveFolloweeNames([uniformFollowee], knownNeurons)[0]
    : undefined;

  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Staked Amount - Prominent Display */}
      <div className="flex flex-col items-center gap-1 pb-2">
        <p className="text-3xl font-bold md:text-4xl" data-testid="neuron-detail-staked-amount">
          {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
        </p>
        {tickersQuery.isLoading ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          usdValue && (
            <p className="text-sm text-muted-foreground md:text-base">
              {t(($) => $.account.approxUsd, { value: usdValue })}
            </p>
          )
        )}
      </div>

      {/* Neuron Info Section */}
      <div className="flex flex-col rounded-lg border bg-muted/30">
        <InfoRow label={t(($) => $.neuron.stakeId)} dataTestId="neuron-detail-stake-id">
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
            <span className="font-semibold">{shortenNeuronId(neuron.neuronId)}</span>
            <CopyButton
              value={neuron.neuronId.toString()}
              label={t(($) => $.neuron.stakeId)}
              className="size-6 border-0 p-0 hover:bg-transparent"
            />
          </div>
        </InfoRow>

        <InfoRow label={t(($) => $.neuron.created)} dataTestId="neuron-detail-creation-date">
          <span className="font-semibold">{creationDate}</span>
        </InfoRow>

        <InfoRow label={t(($) => $.neuron.dissolveDelay)} dataTestId="neuron-detail-dissolve-delay">
          <div className="flex items-center gap-2">
            <NeuronStateBadge isDissolved={isDissolved} isDissolving={isDissolving} />
            <span className="font-semibold">{durationText}</span>
          </div>
        </InfoRow>

        <InfoRow label={t(($) => $.common.apy)} dataTestId="neuron-detail-apy">
          {isApyLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : nonNullish(apy) && apyColor.ready ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: apyColor.textColor }}>
                {formatPercentage(apy.cur)}
              </span>
              {apyColor.isMax && (
                <span className="rounded bg-green-600 px-1 py-0.5 text-[10px] font-bold text-white uppercase">
                  {t(($) => $.common.max)}
                </span>
              )}
            </div>
          ) : (
            <span className="font-semibold text-muted-foreground">—</span>
          )}
        </InfoRow>

        <InfoRow
          label={t(($) => $.neuron.stakedMaturity)}
          dataTestId="neuron-detail-staked-maturity"
        >
          <div className="flex items-center gap-1">
            <span className="font-semibold">{formatNumber(stakedMaturity)}</span>
            <MaturitySymbol />
          </div>
        </InfoRow>

        <InfoRow
          label={t(($) => $.neuron.unstakedMaturity)}
          dataTestId="neuron-detail-unstaked-maturity"
        >
          <div className="flex items-center gap-1">
            <span className="font-semibold">{formatNumber(unstakedMaturity)}</span>
            <MaturitySymbol />
          </div>
        </InfoRow>

        <InfoRow
          label={t(($) => $.neuron.maturityMode)}
          isLast={!isAdvancedFollowing}
          dataTestId="neuron-detail-maturity-mode"
        >
          <span className="font-semibold">
            {isAutoStake ? t(($) => $.neuron.autoStake) : t(($) => $.neuron.keepLiquid)}
          </span>
        </InfoRow>

        {isAdvancedFollowing && (
          <InfoRow label={t(($) => $.neuron.following)} isLast dataTestId="neuron-detail-following">
            {knownNeuronsQuery.isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : !hasFollowees ? (
              <Link
                to="/voting"
                search={{ manageFollowing: true }}
                className="font-semibold text-primary hover:underline"
              >
                {t(($) => $.neuron.followingNotSet)}
              </Link>
            ) : followeeName ? (
              <span className="max-w-[160px] truncate font-semibold">{followeeName}</span>
            ) : (
              <button
                className="font-semibold text-primary hover:underline"
                onClick={() => setFollowingDialogOpen(true)}
              >
                {t(($) => $.neuron.followingViewDetails)}
              </button>
            )}
          </InfoRow>
        )}
      </div>

      {isAdvancedFollowing && (
        <NeuronDetailFollowingDialog
          open={followingDialogOpen}
          onOpenChange={setFollowingDialogOpen}
          neuron={neuron}
          knownNeurons={knownNeurons}
        />
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <ActionButton
          icon={<PlusCircle className="size-8" />}
          label={t(($) => $.neuronDetailModal.actions.increaseStake)}
          onClick={() => onNavigate(NeuronDetailView.IncreaseStake)}
        />

        <ActionButton
          icon={<Clock className="size-8" />}
          label={t(($) => $.neuronDetailModal.actions.increaseDelay)}
          onClick={() => onNavigate(NeuronDetailView.IncreaseDelay)}
        />

        <ActionButton
          icon={<Settings className="size-8" />}
          label={t(($) => $.neuronDetailModal.actions.maturityMode)}
          onClick={() => onNavigate(NeuronDetailView.MaturityMode)}
        />

        <ActionButton
          icon={isDissolving ? <Lock className="size-8" /> : <Unlock className="size-8" />}
          label={
            isDissolving
              ? t(($) => $.neuronDetailModal.actions.stopDissolving)
              : t(($) => $.neuronDetailModal.actions.startDissolving)
          }
          onClick={() => onNavigate(NeuronDetailView.Dissolve)}
        />

        {IS_TESTNET && (
          <ActionButton
            icon={<Wrench className="size-8" />}
            label={t(($) => $.neuronDetailModal.actions.devActions)}
            onClick={() => onNavigate(NeuronDetailView.DevActions)}
            className="col-span-2"
          />
        )}
      </div>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
  dataTestId?: string;
};

function InfoRow({ label, children, isLast = false, dataTestId }: InfoRowProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-border/50' : ''}`}
    >
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="text-[15px]" data-testid={dataTestId}>
        {children}
      </div>
    </div>
  );
}

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
};

function ActionButton({ icon, label, onClick, className }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        'group flex h-auto flex-col items-center justify-center gap-2 overflow-hidden py-5 ring-0 ring-offset-0 transition-colors duration-200 outline-none hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0',
        className,
      )}
      onClick={onClick}
      data-testid={`neuron-detail-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className="transition-opacity duration-100 ease-out group-hover:opacity-0 group-focus-visible:opacity-0 group-disabled:group-hover:opacity-100 group-disabled:group-focus-visible:opacity-100">
        <span className="block text-primary transition-transform duration-300 ease-out group-hover:scale-[10] group-focus-visible:scale-[10] group-disabled:group-hover:scale-100 group-disabled:group-focus-visible:scale-100">
          {icon}
        </span>
      </span>
      <span className="text-[15px] font-semibold transition-transform duration-500 ease-out group-hover:-translate-y-5 group-focus-visible:-translate-y-5 group-disabled:group-hover:translate-y-0 group-disabled:group-focus-visible:translate-y-0">
        {label}
      </span>
    </Button>
  );
}
