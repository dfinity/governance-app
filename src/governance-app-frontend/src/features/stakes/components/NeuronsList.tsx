import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronId } from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { NeuronCard } from './NeuronCard';
import { NeuronDetailModal } from './neuronDetail';

type Props = {
  neurons: NeuronInfo[];
  selectedNeuronId: bigint | undefined;
  selectedAction?: string;
  onSelectedNeuronChange: (neuronId: bigint | undefined, action?: string) => void;
};

export const NeuronsList = ({
  neurons,
  selectedNeuronId,
  selectedAction,
  onSelectedNeuronChange,
}: Props) => {
  const apyData = useStakingRewards();

  const selectedNeuron = neurons.find((n) => n.neuronId === selectedNeuronId) ?? null;
  const isModalOpen = selectedNeuron !== null;

  const handleCardClick = (neuronId: bigint) => onSelectedNeuronChange(neuronId);
  const handleModalClose = (open: boolean) => !open && onSelectedNeuronChange(undefined);
  const handleActionChange = (action: string | undefined) =>
    selectedNeuronId && onSelectedNeuronChange(selectedNeuronId, action);

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
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
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
        neuron={selectedNeuron}
        view={selectedAction}
        isOpen={isModalOpen}
        onOpenChange={handleModalClose}
        onViewChange={handleActionChange}
      />
    </div>
  );
};
