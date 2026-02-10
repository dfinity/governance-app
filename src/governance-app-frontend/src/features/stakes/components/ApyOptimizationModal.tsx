import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { TFunction } from 'i18next';
import { CheckCircle2, MessageCircleQuestionMarkIcon } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { Spinner } from '@components/Spinner';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useGovernanceNeurons } from '@hooks/governance';
import { useApyColor } from '@hooks/useApyColor';
import { useStakingRewards } from '@hooks/useStakingRewards';
import {
  getNeuronId,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolving,
  getNeuronIsMaxDissolveDelay,
} from '@utils/neuron';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

type NeuronOptimizationStatus = {
  neuron: NeuronInfo;
  isOptimized: boolean;
  issues: string[];
};

function getNeuronOptimizationStatus(neuron: NeuronInfo, t: TFunction): NeuronOptimizationStatus {
  const issues: string[] = [];

  if (getNeuronIsDissolving(neuron)) {
    issues.push(t(($) => $.apyOptimizationModal.issues.notLocked));
  }

  if (!getNeuronIsMaxDissolveDelay(neuron)) {
    issues.push(t(($) => $.apyOptimizationModal.issues.delayLow));
  }

  if (!getNeuronIsAutoStakingMaturity(neuron)) {
    issues.push(t(($) => $.apyOptimizationModal.issues.notAutoStaking));
  }

  return {
    neuron,
    isOptimized: !issues.length,
    issues,
  };
}

export function ApyOptimizationModal() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const neurons = neuronsQuery.data?.response ?? [];

  const stakingRewards = useStakingRewards();
  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
      )
    : '...';
  const apyColor = useApyColor(
    isStakingRewardDataReady(stakingRewards) ? stakingRewards.apy.cur : 0,
  );

  const isLoading = neuronsQuery.isLoading || stakingRewards.loading;

  const neuronStatuses = neurons.map((neuron) => getNeuronOptimizationStatus(neuron, t));
  const hasUnoptimized = neuronStatuses.some((status) => !status.isOptimized);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger
        className="cursor-pointer rounded-sm transition-all duration-300 hover:scale-110 focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-1 focus-visible:outline-none"
        disabled={isLoading}
        aria-label={t(($) => $.apyOptimizationModal.ariaLabel)}
      >
        {isLoading ? (
          <span className="text-muted-foreground">
            <Spinner className="size-6" />
          </span>
        ) : (
          <MessageCircleQuestionMarkIcon
            style={{ color: apyColor.ready ? apyColor.textColor : undefined }}
            className="size-6"
          />
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="rounded-md border p-2"
              style={{
                backgroundColor: apyColor.ready ? apyColor.bgColor : undefined,
                borderColor: apyColor.ready ? apyColor.borderColor : undefined,
              }}
            >
              <MessageCircleQuestionMarkIcon
                className="size-6"
                style={{ color: apyColor.ready ? apyColor.textColor : undefined }}
              />
            </div>
            <ResponsiveDialogTitle>{t(($) => $.apyOptimizationModal.title)}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4 text-sm text-muted-foreground md:pb-0">
          <p>
            <Trans
              values={{ maxApy }}
              i18nKey={($) => $.apyOptimizationModal.introduction}
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>

          <div className="pt-2">
            <h4 className="mb-2 font-semibold text-foreground">
              {t(($) => $.apyOptimizationModal.optimalSettings.title)}
            </h4>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>{t(($) => $.apyOptimizationModal.optimalSettings.lockedLabel)}:</strong>{' '}
                {t(($) => $.apyOptimizationModal.optimalSettings.locked)}
              </li>
              <li>
                <strong>{t(($) => $.apyOptimizationModal.optimalSettings.delayLabel)}:</strong>{' '}
                {t(($) => $.apyOptimizationModal.optimalSettings.delay)}
              </li>
              <li>
                <strong>{t(($) => $.apyOptimizationModal.optimalSettings.autoStakeLabel)}:</strong>{' '}
                {t(($) => $.apyOptimizationModal.optimalSettings.autoStake)}
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <h4 className="mb-3 font-semibold text-foreground">
              {t(($) => $.apyOptimizationModal.yourNeurons)}
            </h4>

            {neurons.length === 0 ? (
              <p className="text-muted-foreground">{t(($) => $.apyOptimizationModal.noNeurons)}</p>
            ) : (
              <div className="space-y-2">
                {neuronStatuses.map(({ neuron, isOptimized, issues }) => (
                  <NeuronOptimizationItem
                    key={getNeuronId(neuron)}
                    neuron={neuron}
                    isOptimized={isOptimized}
                    issues={issues}
                  />
                ))}
              </div>
            )}

            {neurons.length > 0 && !hasUnoptimized && (
              <p className="mt-3 flex items-center justify-center gap-2 font-semibold text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4" />
                {t(($) => $.apyOptimizationModal.allOptimized)}
              </p>
            )}
          </div>

          {/* @TODO: Implement optimize all neurons - atomic API pending.
           hasUnoptimized && (
            <Button
              className="w-full"
              onClick={() => {}}
            >
              {t(($) => $.apyOptimizationModal.optimizeAll)}
            </Button>
          )} */}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type NeuronOptimizationItemProps = {
  neuron: NeuronInfo;
  isOptimized: boolean;
  issues: string[];
};

function NeuronOptimizationItem({ neuron, isOptimized, issues }: NeuronOptimizationItemProps) {
  const { t } = useTranslation();
  const neuronId = getNeuronId(neuron);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono font-semibold text-foreground">
          {t(($) => $.apyOptimizationModal.neuronLabel, { id: neuronId })}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {isOptimized ? (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <CheckCircle2 className="mr-1 size-3" />
              {t(($) => $.apyOptimizationModal.fullyOptimized)}
            </Badge>
          ) : (
            issues.map((issue) => (
              <Badge
                key={issue}
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {issue}
              </Badge>
            ))
          )}
        </div>
      </div>
      {!isOptimized && (
        <Button
          variant="outline"
          size="sm"
          className="transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
          asChild
        >
          <Link to="/stakes" search={{ stakeId: neuron.neuronId.toString() }}>
            {t(($) => $.apyOptimizationModal.maximize)}
          </Link>
        </Button>
      )}
    </div>
  );
}
