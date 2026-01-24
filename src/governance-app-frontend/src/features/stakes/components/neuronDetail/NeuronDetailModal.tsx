import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useStakingRewards } from '@hooks/useStakingRewards';
import {
  getNeuronId,
  getNeuronIsAutoStakingMaturity,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
} from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { NeuronDetailDissolveView } from './NeuronDetailDissolveView';
import { NeuronDetailIncreaseDelayView } from './NeuronDetailIncreaseDelayView';
import { NeuronDetailIncreaseStakeView } from './NeuronDetailIncreaseStakeView';
import { NeuronDetailMaturityModeView } from './NeuronDetailMaturityModeView';
import { NeuronDetailSummaryView } from './NeuronDetailSummaryView';
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
  const [isProcessing, setIsProcessing] = useState(false);

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

  const stakingRewards = useStakingRewards();
  const apy =
    displayNeuron && isStakingRewardDataReady(stakingRewards)
      ? stakingRewards.apy.neurons.get(getNeuronId(displayNeuron))
      : undefined;

  const goBack = () => {
    if (!isProcessing) {
      onViewChange(NeuronDetailView.Summary);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isProcessing && !open) return;
    onOpenChange(open);
  };

  if (!displayNeuron) return null;

  const isDissolved = getNeuronIsDissolved(displayNeuron);
  const isDissolving = getNeuronIsDissolving(displayNeuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(displayNeuron);

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
    <>
      <NavigationBlockerDialog
        isBlocked={isProcessing}
        description={t(($) => $.neuronDetailModal.confirmNavigation)}
      />
      <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange} dismissible={!isProcessing}>
        <ResponsiveDialogContent
          className="flex max-h-[90vh] flex-col focus:outline-none"
          showCloseButton={!isProcessing}
          data-testid="neuron-detail-modal"
        >
          <ResponsiveDialogHeader className="shrink-0">
            <div className="relative flex items-center justify-center">
              {displayView !== NeuronDetailView.Summary && !isProcessing && (
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
              <NeuronDetailSummaryView
                neuron={displayNeuron}
                apy={apy}
                isApyLoading={!isStakingRewardDataReady(stakingRewards)}
                isDissolved={isDissolved}
                isDissolving={isDissolving}
                isAutoStake={isAutoStake}
                onNavigate={onViewChange}
              />
            )}

            {displayView === NeuronDetailView.IncreaseStake && (
              <NeuronDetailIncreaseStakeView
                neuron={displayNeuron}
                onSuccess={goBack}
                onProcessingChange={setIsProcessing}
              />
            )}

            {displayView === NeuronDetailView.IncreaseDelay && (
              <NeuronDetailIncreaseDelayView
                neuron={displayNeuron}
                onSuccess={goBack}
                onProcessingChange={setIsProcessing}
              />
            )}

            {displayView === NeuronDetailView.MaturityMode && (
              <NeuronDetailMaturityModeView
                neuron={displayNeuron}
                onSuccess={goBack}
                onProcessingChange={setIsProcessing}
              />
            )}

            {displayView === NeuronDetailView.Dissolve && (
              <NeuronDetailDissolveView
                neuron={displayNeuron}
                isDissolving={isDissolving}
                onSuccess={goBack}
                onProcessingChange={setIsProcessing}
              />
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
