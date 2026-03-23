import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useEffect, useRef } from 'react';

import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronId } from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { DisburseIcpModal } from './DisburseIcpModal';
import { DisburseMaturityModal } from './DisburseMaturityModal';
import { NeuronCard } from './NeuronCard';
import {
  isValidNeuronAction,
  isValidNeuronDetailView,
  NeuronDetailModal,
  NeuronDetailView,
  NeuronStandaloneAction,
} from './neuronDetail';
import { StakeMaturityModal } from './StakeMaturityModal';

type Props = {
  onSelectedNeuronChange: (neuronId: bigint | undefined, action?: string) => void;
  selectedNeuronId: bigint | undefined;
  selectedAction?: string;
  neurons: NeuronInfo[];
};

export const NeuronsList = ({
  onSelectedNeuronChange,
  selectedNeuronId,
  selectedAction,
  neurons,
}: Props) => {
  const apyData = useStakingRewards();

  const selectedNeuron = neurons.find((n) => n.neuronId === selectedNeuronId) ?? null;

  // Keep last neuron in a ref so standalone modals stay mounted during close animation
  const lastNeuronRef = useRef<NeuronInfo | null>(null);
  useEffect(() => {
    if (selectedNeuron) lastNeuronRef.current = selectedNeuron;
  }, [selectedNeuron]);
  const displayNeuron = selectedNeuron ?? lastNeuronRef.current;

  const validAction = isValidNeuronAction(selectedAction) ? selectedAction : undefined;
  const standaloneAction = isValidNeuronDetailView(validAction) ? undefined : validAction;
  const detailView = isValidNeuronDetailView(validAction) ? validAction : undefined;
  const isDetailModalOpen = selectedNeuron !== null && !standaloneAction;
  const isStandaloneModalOpen = selectedNeuron !== null && !!standaloneAction;

  const handleCardClick = (neuronId: bigint) => onSelectedNeuronChange(neuronId);
  const handleModalClose = (open: boolean) => !open && onSelectedNeuronChange(undefined);
  const handleActionChange = (action: NeuronDetailView) =>
    onSelectedNeuronChange(selectedNeuronId, action);

  return (
    <div className="flex flex-col gap-4 text-xl">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {neurons?.map((neuron) => {
          const apy = isStakingRewardDataReady(apyData)
            ? apyData.apy.neurons.get(getNeuronId(neuron))
            : undefined;

          return (
            <div
              key={String(neuron.neuronId)}
              onClick={() => handleCardClick(neuron.neuronId)}
              className="h-full cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardClick(neuron.neuronId);
                }
              }}
            >
              <NeuronCard
                neuron={neuron}
                apy={apy}
                onAction={(action) => onSelectedNeuronChange(neuron.neuronId, action)}
              />
            </div>
          );
        })}
      </div>

      <NeuronDetailModal
        view={detailView ?? NeuronDetailView.Summary}
        onViewChange={handleActionChange}
        onOpenChange={handleModalClose}
        neuron={selectedNeuron}
        isOpen={isDetailModalOpen}
      />

      {displayNeuron && (
        <>
          <DisburseIcpModal
            neuron={displayNeuron}
            isOpen={
              isStandaloneModalOpen && standaloneAction === NeuronStandaloneAction.DisburseIcp
            }
            onOpenChange={handleModalClose}
          />
          <DisburseMaturityModal
            neuron={displayNeuron}
            isOpen={
              isStandaloneModalOpen && standaloneAction === NeuronStandaloneAction.DisburseMaturity
            }
            onOpenChange={handleModalClose}
          />
          <StakeMaturityModal
            neuron={displayNeuron}
            isOpen={
              isStandaloneModalOpen && standaloneAction === NeuronStandaloneAction.StakeMaturity
            }
            onOpenChange={handleModalClose}
          />
        </>
      )}
    </div>
  );
};
