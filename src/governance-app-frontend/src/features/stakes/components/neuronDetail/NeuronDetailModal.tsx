import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { ArrowLeft } from 'lucide-react';
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
import { isValidNeuronDetailView, NeuronDetailView } from './types';

type Props = {
  neuron: NeuronInfo | null;
  view?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: string | undefined) => void;
};

export function NeuronDetailModal({
  neuron,
  view: viewProp,
  isOpen,
  onOpenChange,
  onViewChange,
}: Props) {
  const { t } = useTranslation();

  const view = isValidNeuronDetailView(viewProp) ? viewProp : NeuronDetailView.Summary;

  const { data: balanceData } = useIcpLedgerAccountBalance();
  const availableBalance = bigIntDiv(balanceData?.response || 0n, E8Sn);
  const hasAvailableBalance = availableBalance > 0;

  const stakingRewards = useStakingRewards();
  const apy =
    neuron && isStakingRewardDataReady(stakingRewards)
      ? stakingRewards.apy.neurons.get(getNeuronId(neuron))
      : undefined;

  const handleViewChange = (newView: NeuronDetailView) => {
    onViewChange(newView === NeuronDetailView.Summary ? undefined : newView);
  };

  const goBack = () => handleViewChange(NeuronDetailView.Summary);

  if (!neuron) {
    throw new Error('Neuron not found');
  }

  const isDissolved = getNeuronIsDissolved(neuron);
  const isDissolving = getNeuronIsDissolving(neuron);
  const isAutoStake = getNeuronIsAutoStakingMaturity(neuron);
  const isMaxDelay = getNeuronIsMaxDissolveDelay(neuron);

  const getTitle = (): string => {
    switch (view) {
      case NeuronDetailView.Summary:
        return t(($) => $.neuronDetailModal.title, { neuronId: neuron.neuronId.toString() });
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
            {view !== NeuronDetailView.Summary && (
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
          {view === NeuronDetailView.Summary && (
            <SummaryView
              neuron={neuron}
              apy={apy}
              isApyLoading={!isStakingRewardDataReady(stakingRewards)}
              isDissolved={isDissolved}
              isDissolving={isDissolving}
              isAutoStake={isAutoStake}
              isMaxDelay={isMaxDelay}
              hasAvailableBalance={hasAvailableBalance}
              onNavigate={handleViewChange}
            />
          )}

          {view === NeuronDetailView.IncreaseStake && (
            <PlaceholderView
              description={t(($) => $.neuronDetailModal.increaseStake.description)}
            />
          )}

          {view === NeuronDetailView.IncreaseDelay && (
            <PlaceholderView
              description={t(($) => $.neuronDetailModal.increaseDelay.description)}
            />
          )}

          {view === NeuronDetailView.MaturityMode && (
            <PlaceholderView description={t(($) => $.neuronDetailModal.maturityMode.description)} />
          )}

          {view === NeuronDetailView.Dissolve && (
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
