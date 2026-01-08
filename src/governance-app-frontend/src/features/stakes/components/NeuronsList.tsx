import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';

import { useStakingRewards } from '@hooks/useStakingRewards';
import { getNeuronId } from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { NeuronCard } from './NeuronCard';

type Props = {
  neurons: NeuronInfo[];
};

export const NeuronsList = ({ neurons }: Props) => {
  const apyData = useStakingRewards();

  return (
    <div className="flex flex-col gap-4 text-xl">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {neurons?.map((neuron) => {
          const apy = isStakingRewardDataReady(apyData)
            ? apyData.apy.neurons.get(getNeuronId(neuron))
            : undefined;

          return (
            <Link to="/stakes/$id" params={{ id: neuron.neuronId }} key={neuron.neuronId}>
              <NeuronCard neuron={neuron} apy={apy} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};
