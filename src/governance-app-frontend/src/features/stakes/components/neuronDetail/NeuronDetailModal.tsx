import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import {
  getNeuronId,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
  getNeuronIsMaxDissolveDelay,
} from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { SummaryView } from './SummaryView';
import { NeuronDetailView } from './types';

type Props = {
  neuron: NeuronInfo | null;
  view: NeuronDetailView;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: NeuronDetailView) => void;
};

export function NeuronDetailModal({ neuron, view, isOpen, onOpenChange, onViewChange }: Props) {
  const { t } = useTranslation();

  // Keep neuron and view in refs to persist during close animation
  const neuronRef = useRef<NeuronInfo | null>(neuron);
  const viewRef = useRef<NeuronDetailView>(view);

  useEffect(() => {
    if (isOpen) {
      // Update refs when modal is open
      neuronRef.current = neuron;
      viewRef.current = view;
    } else {
      // Clear refs after close animation finishes
      const timer = setTimeout(() => {
        neuronRef.current = null;
        viewRef.current = NeuronDetailView.Summary;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [neuron, view, isOpen]);

  // Use props when open, refs during close animation
  const displayNeuron = isOpen ? neuron : neuronRef.current;
  const displayView = isOpen ? view : viewRef.current;

  const { data: balanceData } = useIcpLedgerAccountBalance();
  const availableBalance = bigIntDiv(balanceData?.response || 0n, E8Sn);
  const hasAvailableBalance = availableBalance > 0;

  const stakingRewards = useStakingRewards();
  const apy =
    displayNeuron && isStakingRewardDataReady(stakingRewards)
      ? stakingRewards.apy.neurons.get(getNeuronId(displayNeuron))
      : undefined;

  const goBack = () => onViewChange(NeuronDetailView.Summary);

  if (!displayNeuron) return null;

  const isDissolved = getNeuronIsDissolved(displayNeuron);
  const isDissolving = getNeuronIsDissolving(displayNeuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(displayNeuron);
  const isMaxDelay = getNeuronIsMaxDissolveDelay(displayNeuron);

  const getTitle = (): string => {
    switch (displayView) {
      case NeuronDetailView.Summary:
        return t(($) => $.neuronDetailModal.title, { neuronId: displayNeuron.neuronId.toString() });
      case NeuronDetailView.IncreaseStake:
        return t(($) => $.neuronDetailModal.increaseStake.title);
      case NeuronDetailView.IncreaseDelay:
        return t(($) => $.neuronDetailModal.increaseDelay.title);
      case NeuronDetailView.MaturityMode:
        return t(($) => $.neuronDetailModal.maturityMode.title);
      case NeuronDetailView.Dissolve:
        return isDissolving
          ? t(($) => $.neuronDetailModal.dissolve.stopTitle)
          : t(($) => $.neuronDetailModal.dissolve.startTitle);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col focus:outline-none"
        data-testid="neuron-detail-modal"
      >
        <ResponsiveDialogHeader className="shrink-0">
          <div className="relative flex items-center justify-center">
            {displayView !== NeuronDetailView.Summary && (
              <button
                onClick={goBack}
                className="absolute left-0 rounded-md p-1 hover:bg-muted"
                aria-label={t(($) => $.common.back)}
                data-testid="neuron-detail-back-btn"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <ResponsiveDialogTitle>{getTitle()}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
          {displayView === NeuronDetailView.Summary && (
            <SummaryView
              neuron={displayNeuron}
              apy={apy}
              isApyLoading={!isStakingRewardDataReady(stakingRewards)}
              isDissolved={isDissolved}
              isDissolving={isDissolving}
              isAutoStake={isAutoStake}
              isMaxDelay={isMaxDelay}
              hasAvailableBalance={hasAvailableBalance}
              onNavigate={onViewChange}
            />
          )}

          {displayView === NeuronDetailView.IncreaseStake && (
            <PlaceholderView
              description={t(($) => $.neuronDetailModal.increaseStake.description)}
            />
          )}

          {displayView === NeuronDetailView.IncreaseDelay && (
            <PlaceholderView
              description={t(($) => $.neuronDetailModal.increaseDelay.description)}
            />
          )}

          {displayView === NeuronDetailView.MaturityMode && (
            <PlaceholderView description={t(($) => $.neuronDetailModal.maturityMode.description)} />
          )}

          {displayView === NeuronDetailView.Dissolve && (
            <PlaceholderView
              description={
                isDissolving
                  ? t(($) => $.neuronDetailModal.dissolve.stopDescription)
                  : t(($) => $.neuronDetailModal.dissolve.startDescription)
              }
            />
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// Placeholder View for sub-views (to be implemented)
type PlaceholderViewProps = {
  description: string;
};

function PlaceholderView({ description }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <p className="text-muted-foreground">{description}</p>
      <p className="text-sm text-muted-foreground/60">
        {/* @TODO: Implement this view */}
        Coming soon...
      </p>
    </div>
  );
}
