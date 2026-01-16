import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { TFunction } from 'i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { useGovernanceNeurons } from '@hooks/governance';
import { useStakingRewards } from '@hooks/useStakingRewards';
import {
  getNeuronId,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolving,
  getNeuronIsMaxDissolveDelay,
} from '@utils/neuron';
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
    ? (stakingRewards.stakingFlowApyPreview[96].autoStake.locked * 100).toFixed(2)
    : '';

  const isLoading = neuronsQuery.isLoading || stakingRewards.loading;

  const neuronStatuses = neurons.map((neuron) => getNeuronOptimizationStatus(neuron, t));
  const hasUnoptimized = neuronStatuses.some((status) => !status.isOptimized);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger
        className="cursor-pointer rounded-sm border border-orange-300 bg-orange-100 p-0.5 transition-all duration-300 hover:scale-110 focus:outline-none dark:border-orange-700 dark:bg-orange-900/30"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="text-orange-500 dark:text-orange-400">
            <Spinner className="size-5" />
          </span>
        ) : (
          <AlertCircle className="size-5 text-orange-500 dark:text-orange-400" />
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-orange-300 bg-orange-100 p-2 dark:border-orange-700 dark:bg-orange-900/30">
              <AlertCircle className="size-6 text-orange-500 dark:text-orange-400" />
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
        <Button variant="secondary" size="sm" asChild>
          <Link to="/stakes/$id" params={{ id: neuron.neuronId }}>
            {t(($) => $.apyOptimizationModal.maximize)}
          </Link>
        </Button>
      )}
    </div>
  );
}
