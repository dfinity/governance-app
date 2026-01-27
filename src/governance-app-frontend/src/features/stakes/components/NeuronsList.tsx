import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronId } from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { NeuronCard } from './NeuronCard';
import { isValidNeuronDetailView, NeuronDetailModal, NeuronDetailView } from './neuronDetail';

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
  const isModalOpen = selectedNeuron !== null;

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
              <NeuronCard neuron={neuron} apy={apy} />
            </div>
          );
        })}
      </div>

      <NeuronDetailModal
        view={isValidNeuronDetailView(selectedAction) ? selectedAction : NeuronDetailView.Summary}
        onViewChange={handleActionChange}
        onOpenChange={handleModalClose}
        neuron={selectedNeuron}
        isOpen={isModalOpen}
      />
    </div>
  );
};
