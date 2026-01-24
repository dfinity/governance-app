import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { Clock, Lock, PlusCircle, Settings, Unlock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { MaturitySymbol } from '@components/MaturitySymbol';
import { Skeleton } from '@components/Skeleton';
import { E8Sn } from '@constants/extra';
import { useApyColor } from '@hooks/useApyColor';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber, formatPercentage } from '@utils/numbers';

import { NeuronStateBadge } from '../NeuronStateBadge';
import { NeuronDetailView } from './types';

type Props = {
  neuron: NeuronInfo;
  apy: { cur: number; max: number } | undefined;
  isApyLoading: boolean;
  isDissolved: boolean;
  isDissolving: boolean;
  isAutoStake: boolean;
  onNavigate: (view: NeuronDetailView) => void;
};

export function NeuronDetailSummaryView({
  neuron,
  apy,
  isApyLoading,
  isDissolved,
  isDissolving,
  isAutoStake,
  onNavigate,
}: Props) {
  const { t } = useTranslation();
  const apyColor = useApyColor(apy?.cur ?? 0);

  const stakedAmount = neuron.fullNeuron?.cachedNeuronStake
    ? bigIntDiv(neuron.fullNeuron.cachedNeuronStake, E8Sn)
    : 0;

  const stakedMaturity = neuron.fullNeuron?.stakedMaturityE8sEquivalent
    ? bigIntDiv(neuron.fullNeuron.stakedMaturityE8sEquivalent, E8Sn)
    : 0;

  const unstakedMaturity = neuron.fullNeuron?.maturityE8sEquivalent
    ? bigIntDiv(neuron.fullNeuron.maturityE8sEquivalent, E8Sn)
    : 0;

  const dissolveDelaySeconds = neuron.dissolveDelaySeconds;
  const durationText = secondsToDuration({
    seconds: dissolveDelaySeconds || 0n,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Neuron Info Section */}
      <div className="flex flex-col rounded-lg border bg-muted/30">
        <InfoRow label={t(($) => $.neuron.stakedAmount)}>
          <span className="font-semibold">
            {formatNumber(stakedAmount)} {t(($) => $.common.icp)}
          </span>
        </InfoRow>

        <InfoRow label={t(($) => $.neuron.dissolveDelay)}>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{durationText}</span>
            <NeuronStateBadge isDissolved={isDissolved} isDissolving={isDissolving} />
          </div>
        </InfoRow>

        <InfoRow label={t(($) => $.common.apy)}>
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

        <InfoRow label={t(($) => $.neuron.stakedMaturity)}>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{formatNumber(stakedMaturity)}</span>
            <MaturitySymbol />
          </div>
        </InfoRow>

        <InfoRow label={t(($) => $.neuron.unstakedMaturity)}>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{formatNumber(unstakedMaturity)}</span>
            <MaturitySymbol />
          </div>
        </InfoRow>

        <InfoRow label={t(($) => $.neuron.maturityMode)} isLast>
          <span className="font-semibold">
            {isAutoStake ? t(($) => $.neuron.autoStake) : t(($) => $.neuron.keepLiquid)}
          </span>
        </InfoRow>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <ActionButton
          icon={<PlusCircle className="size-8" />}
          label={t(($) => $.neuronDetailModal.actions.increaseStake)}
          onClick={() => onNavigate(NeuronDetailView.IncreaseStake)}
          disabledReason={t(($) => $.neuronDetailModal.disabled.noBalance)}
        />

        <ActionButton
          icon={<Clock className="size-8" />}
          label={t(($) => $.neuronDetailModal.actions.increaseDelay)}
          onClick={() => onNavigate(NeuronDetailView.IncreaseDelay)}
          disabledReason={t(($) => $.neuronDetailModal.disabled.maxDelay)}
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
      </div>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
};

function InfoRow({ label, children, isLast = false }: InfoRowProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-border/50' : ''}`}
    >
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="text-[15px]">{children}</div>
    </div>
  );
}

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
};

function ActionButton({ icon, label, onClick, disabled, disabledReason }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      className="group flex h-auto flex-col items-center justify-center gap-2 overflow-hidden py-5 ring-0 ring-offset-0 transition-colors duration-200 outline-none hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
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
